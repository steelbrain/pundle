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
  getFileKey,
  getChunkKey,
  type Chunk,
  type Context,
  type ImportResolved,
  type ImportRequest,
  type ImportTransformed,
} from 'pundle-api'

import WorkerDelegate from '../worker/delegate'

// TODO: Locks for files and chunks
export default class Master {
  context: Context
  resolverWorker: WorkerDelegate
  transformWorkers: Array<WorkerDelegate>
  transformQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>

  constructor(context: Context) {
    this.context = context
    this.transformQueue = []

    this.resolverWorker = this._createWorker()
    this.transformWorkers = os
      .cpus()
      // Minus two because we have current plus resolver
      // TODO: See if it's worth doing
      // .slice(-2)
      .map(() => this._createWorker())
  }
  _createWorker(): WorkerDelegate {
    return new WorkerDelegate({
      context: this.context,
      transformQueue: this.transformQueue,
      handleResolve: req => this.resolve(req),
    })
  }
  getAllWorkers(): Array<WorkerDelegate> {
    return [this.resolverWorker].concat(this.transformWorkers)
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
    await pMap(entries, entry => this.transformChunk(getChunk(entry.format, null, entry.filePath), job))
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
              ...chunk,
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
  async transformChunk(chunk: Chunk, job: Job): Promise<void> {
    const { entry } = chunk
    if (!entry) {
      // TODO: Return silently instead?
      throw new Error('Cannot process chunk without entry')
    }
    const lockKey = getChunkKey(chunk)
    if (job.locks.has(lockKey)) {
      return
    }
    if (job.chunks.has(lockKey)) {
      return
    }

    job.locks.add(lockKey)
    try {
      job.chunks.set(lockKey, chunk)

      await this.transformFileTree(
        {
          format: chunk.format,
          filePath: entry,
        },
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
  async transformFileTree(request: ImportResolved, job: Job, forcedOverwrite: boolean = false): Promise<void> {
    const lockKey = getFileKey(request)
    const oldFile = job.files.get(lockKey)
    if (job.locks.has(lockKey)) {
      return
    }
    if (oldFile && !forcedOverwrite) {
      return
    }
    job.locks.add(lockKey)

    try {
      const newFile = await this.queuedTransform(request)
      job.files.set(lockKey, newFile)
      await Promise.all([
        pMap(newFile.imports, fileImport => this.transformFileTree(fileImport, job)),
        pMap(newFile.chunks, fileChunk => this.transformChunk(fileChunk, job)),
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
  async queuedTransform(payload: ImportResolved): Promise<ImportTransformed> {
    const currentWorker = this.transformWorkers.find(worker => worker.busyTransforming === 0)
    let promise
    if (currentWorker) {
      promise = currentWorker.transform(payload)
    } else {
      const { promise: deferredPromise, resolve, reject } = promiseDefer()
      this.transformQueue.push({
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
