// @flow

import os from 'os'
import pMap from 'p-map'
import pReduce from 'p-reduce'
import flatten from 'lodash/flatten'
import promiseDefer from 'promise.defer'
import {
  Job,
  PundleError,
  getChunk,
  getFileImportHash,
  getChunkHash,
  type Chunk,
  type Context,
  type ImportResolved,
  type ImportRequest,
  type ImportProcessed,
} from 'pundle-api'

import WorkerDelegate from '../worker/delegate'

// TODO: Locks for files and chunks
export default class Master {
  context: Context
  resolverWorker: WorkerDelegate
  processorWorkers: Array<WorkerDelegate>
  processQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>

  constructor(context: Context) {
    this.context = context
    this.processQueue = []

    this.resolverWorker = this._createWorker()
    this.processorWorkers = os
      .cpus()
      // Minus two because we have current plus resolver
      // TODO: See if it's worth doing
      // .slice(-2)
      .map(() => this._createWorker())
  }
  _createWorker(): WorkerDelegate {
    return new WorkerDelegate({
      context: this.context,
      processQueue: this.processQueue,
      handleResolve: request => this.resolve(request),
    })
  }
  getAllWorkers(): Array<WorkerDelegate> {
    return [this.resolverWorker].concat(this.processorWorkers)
  }
  async spawnWorkers() {
    try {
      await Promise.all(
        this.getAllWorkers().map(async worker => {
          if (worker.isAlive()) return
          try {
            await worker.spawn()
          } catch (error) {
            worker.dispose()
            throw error
          }
        }),
      )
    } catch (error) {
      throw new PundleError('DAEMON', 'WORKER_CRASHED', `Worker crashed during initial spawn: ${error.message}`)
    }
  }
  dispose() {
    this.getAllWorkers().forEach(function(worker) {
      worker.dispose()
    })
  }
  report(issue: $FlowFixMe) {
    console.log('issue reported to master', issue)
  }

  async execute(): Promise<void> {
    const job = new Job()
    const entries = await Promise.all(
      this.context.config.entry.map(entry =>
        this.resolve({
          request: entry,
          requestFile: null,
          ignoredResolvers: [],
        }),
      ),
    )
    await pMap(entries, entry => this.processChunk(getChunk(entry.format, null, entry.filePath), job))
    const generated = await this.generate(job)

    // TODO: Maybe do something else?
    return generated
  }
  async generate(
    givenJob: Job,
  ): Promise<Array<{ id: string, fileName: string | false, format: string, contents: string | Buffer }>> {
    let job = givenJob.clone()
    const jobTransformers = this.context.getComponents('job-transformer')

    job = await pReduce(
      jobTransformers,
      async (transformedJob, component) => {
        const result = await component.callback({ context: this.context, job: transformedJob })
        // TODO: Validation
        return result ? result.job : transformedJob
      },
      job,
    )

    const chunkGenerators = this.context.getComponents('chunk-generator')
    if (!chunkGenerators.length) {
      throw new Error('No chunk-generator components configured')
    }

    const generated = await pMap(job.chunks.values(), async chunk => {
      for (let i = 0, { length } = chunkGenerators; i < length; i++) {
        const generator = chunkGenerators[i]
        const result = await generator.callback({
          job,
          chunk,
          context: this.context,
        })
        if (result) {
          return result.map(item => ({
            ...item,
            id: chunk.id,
            fileName: this.context.getFileName({
              label: chunk.label,
              entry: chunk.entry,
              format: item.format,
            }),
          }))
        }
      }
      throw new Error(
        `All generators refused to generate chunk of format '${chunk.format}' with label '${chunk.label}' and entry '${
          chunk.entry
        }'`,
      )
    })

    return flatten(generated)
  }
  async processChunk(chunk: Chunk, job: Job): Promise<void> {
    const { entry } = chunk
    if (!entry) {
      // TODO: Return silently instead?
      throw new Error('Cannot process chunk without entry')
    }
    const lockKey = `c${getChunkHash(chunk)}`
    if (job.locks.has(lockKey)) {
      return
    }
    if (job.chunks.has(lockKey)) {
      return
    }

    job.locks.add(lockKey)
    try {
      job.chunks.set(lockKey, chunk)

      await this.processFileTree(
        {
          format: chunk.format,
          filePath: entry,
        },
        false,
        job,
      )
    } catch (error) {
      job.chunks.delete(lockKey)
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  // TODO: Use cached old files here if present on the job?
  async processFileTree(request: ImportResolved, forcedOverwrite: boolean, job: Job): Promise<void> {
    const lockKey = getFileImportHash(request)
    const oldFile = job.files.get(lockKey)
    if (job.locks.has(lockKey)) {
      return
    }
    if (oldFile && !forcedOverwrite) {
      return
    }
    job.locks.add(lockKey)

    try {
      const newFile = await this.queuedProcess(request)
      job.files.set(lockKey, newFile)
      await Promise.all([
        pMap(newFile.imports, fileImport => this.processFileTree(fileImport, false, job)),
        pMap(newFile.chunks, fileChunk => this.processChunk(fileChunk, job)),
      ])
    } catch (error) {
      if (oldFile) {
        job.files.set(lockKey, oldFile)
      } else {
        job.files.delete(lockKey)
      }
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async resolve(request: ImportRequest): Promise<ImportResolved> {
    return this.resolverWorker.resolve(request)
  }
  async queuedProcess(payload: ImportResolved): Promise<ImportProcessed> {
    const currentWorker = this.processorWorkers.find(worker => worker.busyProcessing === 0)
    let promise
    if (currentWorker) {
      promise = currentWorker.process(payload)
    } else {
      const { promise: deferredPromise, resolve, reject } = promiseDefer()
      this.processQueue.push({
        payload,
        resolve,
        reject,
      })
      promise = deferredPromise
    }

    const result = await promise
    if (typeof result.contents === 'object' && result.contents) {
      return {
        ...result,
        contents: Buffer.from(result.contents),
      }
    }
    return result
  }
}
