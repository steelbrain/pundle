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
  getFileName,
  getFileImportHash,
  type Chunk,
  type ImportResolved,
  type ImportRequest,
  type ComponentFileResolverResult,
  type WorkerProcessResult,
} from 'pundle-api'
import type { Config } from 'pundle-core-load-config'

import WorkerDelegate from '../worker/delegate'
import type { RunOptions } from '../types'

// TODO: Locks for files and chunks
export default class Master {
  config: Config
  options: RunOptions
  resolverWorker: WorkerDelegate
  processorWorkers: Array<WorkerDelegate>
  processQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>

  constructor(config: Config, options: RunOptions) {
    this.config = config
    this.options = options
    this.processQueue = []

    this.resolverWorker = this._createWorker()
    this.processorWorkers = os.cpus().map(() => this._createWorker())
  }
  _createWorker(): WorkerDelegate {
    return new WorkerDelegate(this.options, {
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
      throw new PundleError('DAEMON', 'WORKER_CRASHED', null, null, `Worker crashed during initial spawn: ${error.message}`)
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
      this.config.entry.map(entry =>
        this.resolve({
          request: entry,
          requestFile: null,
          ignoredResolvers: [],
        }),
      ),
    )
    await pMap(entries, entry => this.processChunk(getChunk(entry.format, null, entry.resolved), job))
    const generated = await this.generate(job)

    // TODO: Maybe do something else?
    return generated
  }
  async generate(
    givenJob: Job,
  ): Promise<Array<{ id: string, fileName: string | false, format: string, contents: string | Buffer }>> {
    let job = givenJob.clone()
    const jobTransformers = this.config.components.filter(c => c.type === 'job-transformer')

    job = await pReduce(
      jobTransformers,
      async (value, component) => {
        const result = await component.callback(value)
        // TODO: Validation
        return result || value
      },
      job,
    )

    const chunkGenerators = this.config.components.filter(c => c.type === 'chunk-generator')
    if (!chunkGenerators.length) {
      throw new Error('No chunk-generator components configured')
    }

    const generated = await pMap(job.chunks.values(), async chunk => {
      for (let i = 0, { length } = chunkGenerators; i < length; i++) {
        const generator = chunkGenerators[i]
        const result = await generator.callback(chunk, job, {
          getFileName: output => getFileName(this.config.output.formats, output),
        })
        if (result) {
          return result.map(item => ({
            ...item,
            id: chunk.id,
            fileName: getFileName(this.config.output.formats, {
              id: chunk.id,
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
    const lockKey = `c${chunk.id}`
    if (job.locks.has(lockKey)) {
      return
    }
    if (job.chunks.has(chunk.id)) {
      return
    }

    job.locks.add(lockKey)
    try {
      job.chunks.set(chunk.id, chunk)

      await this.processFileTree(
        {
          format: chunk.format,
          filePath: entry,
        },
        false,
        job,
      )
    } catch (error) {
      job.chunks.delete(chunk.id)
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  // TODO: Use cached old files here if present on the job?
  async processFileTree(request: ImportResolved, forcedOverwrite: boolean, job: Job): Promise<void> {
    const lockKey = getFileImportHash(request.filePath, request.format)
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
      job.files.set(newFile.id, newFile)
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
  async resolve(request: ImportRequest): Promise<ComponentFileResolverResult> {
    return this.resolverWorker.resolve(request)
  }
  async queuedProcess(payload: ImportResolved): Promise<WorkerProcessResult> {
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
