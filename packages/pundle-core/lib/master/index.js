// @flow

import os from 'os'
import pMap from 'p-map'
import promiseDefer from 'promise.defer'
import {
  Job,
  PundleError,
  getChunk,
  getFileKey,
  getChunkKey,
  type Chunk,
  type Context,
  type PundleWorker,
  type ImportResolved,
  type ImportRequest,
  type ImportTransformed,
  type ChunksGenerated,
} from 'pundle-api'

import getWatcher from '../watcher'
import WorkerDelegate from '../worker/delegate'
import type { WatchOptions } from '../types'

type TickCallback = (oldFile: ?ImportTransformed, newFile: ImportTransformed) => Promise<void>

// TODO: Locks for files and chunks
export default class Master implements PundleWorker {
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

  async execute(): Promise<ChunksGenerated> {
    const job = new Job()
    const configChunks = (await Promise.all(
      this.context.config.entry.map(entry =>
        this.resolve({
          request: entry,
          requestFile: null,
          ignoredResolvers: [],
        }),
      ),
    )).map(resolved => getChunk(resolved.format, null, resolved.filePath))
    await pMap(configChunks, chunk => this.transformChunk(chunk, job))

    return this.generate(job)
  }
  async generate(job: Job): Promise<ChunksGenerated> {
    return this.context.invokeChunkGenerators(this, { job: await this.context.invokeJobTransformers(this, { job }) })
  }
  async transformChunk(chunk: Chunk, job: Job, tickCallback: ?TickCallback = null): Promise<void> {
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

      const filesToProcess = chunk.imports
      if (chunk.entry) {
        filesToProcess.push({ format: chunk.format, filePath: chunk.entry })
      }
      await pMap(filesToProcess, file => this.transformFileTree(file, job, tickCallback))
    } catch (error) {
      job.chunks.delete(lockKey)
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  // TODO: Use cached old files here if present on the job?
  async transformFileTree(
    request: ImportResolved,
    job: Job,
    tickCallback: ?TickCallback = null,
    forcedOverwrite: boolean = false,
  ): Promise<void> {
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
      const newFile = await this.transform(request)
      job.files.set(lockKey, newFile)
      await Promise.all([
        pMap(newFile.imports, fileImport => this.transformFileTree(fileImport, job, tickCallback)),
        pMap(newFile.chunks, fileChunk => this.transformChunk(fileChunk, job, tickCallback)),
      ])
      if (tickCallback) {
        await tickCallback(oldFile, newFile)
      }
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
  // PundleWorker methods below
  async resolve(request: ImportRequest): Promise<ImportResolved> {
    return this.resolverWorker.resolve(request)
  }
  async transform(payload: ImportResolved): Promise<ImportTransformed> {
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
  async report(issue: any): Promise<void> {
    await this.context.invokeIssueReporters(this, issue)
  }
  // Dangerous territory beyond this point. May God help us all
  async watch(options: WatchOptions): Promise<() => void> {
    const job = new Job()
    const { context } = this

    const configChunks = (await Promise.all(
      this.context.config.entry.map(entry =>
        this.resolve({
          request: entry,
          requestFile: null,
          ignoredResolvers: [],
        }),
      ),
    )).map(resolved => getChunk(resolved.format, null, resolved.filePath))

    const tickCallback = async (oldFile: ?ImportTransformed, newFile: ImportTransformed) => {
      console.log('oldFile', oldFile ? oldFile.filePath : null, 'newFile', newFile.filePath)
      try {
        if (options.tick) {
          options.tick({ context, job, oldFile, newFile })
        }
      } catch (error) {
        this.context.invokeIssueReporters(error)
      }
    }
    let queue = Promise.resolve()
    const queueize = callback => (...args) => {
      queue = queue.then(() => callback(...args)).catch(e => this.context.invokeIssueReporters(e))
    }

    const watcher = getWatcher(options.adapter, this.context.config.rootDirectory, file => {
      console.log('changed', file)
    })
    await pMap(configChunks, chunk => this.transformChunk(chunk, job, tickCallback))

    if (options.ready) {
      await options.ready({ context, job })
    }
    if (options.compiled) {
      await options.compiled({ context, job })
    }
    await watcher.watch()

    return function() {
      watcher.close()
    }
  }
}
