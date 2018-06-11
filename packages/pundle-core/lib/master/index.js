// @flow

import os from 'os'
import pMap from 'p-map'
import promiseDefer from 'promise.defer'
import {
  Job,
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

import Cache from '../cache'
import WorkerDelegate from '../worker/delegate'
import type { InternalChangedFiles as ChangedFiles } from '../types'

type TickCallback = (oldFile: ?ImportTransformed, newFile: ImportTransformed) => Promise<void>

export default class Master implements PundleWorker {
  cache: Cache
  context: Context
  resolverWorker: WorkerDelegate
  transformWorkers: Array<WorkerDelegate>
  transformQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>

  constructor(context: Context) {
    this.cache = new Cache(context)
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
  async initialize() {
    await Promise.all([
      this.cache.load(),
      ...this.getAllWorkers().map(async worker => {
        if (worker.isAlive()) return
        try {
          await worker.spawn()
        } catch (error) {
          worker.dispose()
          throw error
        }
      }),
    ])
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
    await pMap(configChunks, chunk =>
      this.transformChunk({
        job,
        chunk,
        locks: new Set(),
      }),
    )

    return this.generate(await this.transformJob(job))
  }
  async generate(job: Job, chunks: Array<Chunk> = Array.from(job.chunks.values())): Promise<ChunksGenerated> {
    return this.context.invokeChunkGenerators(this, { job, chunks })
  }
  async transformJob(job: Job): Promise<Job> {
    return this.context.invokeJobTransformers(this, { job })
  }
  async transformChunk({
    job,
    chunk,
    locks,
    tickCallback,
    changedImports = new Map(),
  }: {
    job: Job,
    chunk: Chunk,
    locks: Set<string>,
    tickCallback?: ?TickCallback,
    changedImports?: ChangedFiles,
  }): Promise<void> {
    const lockKey = getChunkKey(chunk)
    if (locks.has(lockKey)) {
      return
    }
    if (job.chunks.has(lockKey) && !changedImports.size) {
      return
    }

    locks.add(lockKey)
    try {
      job.chunks.set(lockKey, chunk)

      const filesToProcess = chunk.imports.slice()
      if (chunk.entry) {
        filesToProcess.push({ format: chunk.format, filePath: chunk.entry })
      }
      await pMap(filesToProcess, fileImport =>
        this.transformFileTree({
          job,
          locks,
          request: fileImport,
          tickCallback,
          changedImports,
        }),
      )
    } catch (error) {
      job.chunks.delete(lockKey)
      throw error
    }
  }
  async transformFileTree({
    job,
    locks,
    request,
    tickCallback,
    changedImports = new Map(),
  }: {
    job: Job,
    locks: Set<string>,
    request: ImportResolved,
    tickCallback?: ?TickCallback,
    changedImports?: ChangedFiles,
  }): Promise<void> {
    const lockKey = getFileKey(request)
    const fileChanged = changedImports.has(lockKey)
    const oldFile = job.files.get(lockKey)

    if (locks.has(lockKey)) {
      return
    }
    locks.add(lockKey)

    let cachedFile = null
    if (!fileChanged) {
      cachedFile = await this.cache.getFile(request)
    }

    let newFile
    if (oldFile && !fileChanged) {
      newFile = oldFile
    } else if (cachedFile && !fileChanged) {
      newFile = cachedFile
      job.files.set(lockKey, newFile)
    } else {
      changedImports.delete(lockKey)
      newFile = await this.transform(request)
      job.files.set(lockKey, newFile)
      this.cache.setFile(request, newFile)
    }

    await Promise.all([
      pMap(newFile.imports, fileImport =>
        this.transformFileTree({
          job,
          locks,
          request: fileImport,
          tickCallback,
          changedImports,
        }),
      ),
      pMap(newFile.chunks, fileChunk =>
        this.transformChunk({
          job,
          chunk: fileChunk,
          locks,
          tickCallback,
          changedImports,
        }),
      ),
    ])

    if (oldFile !== newFile && cachedFile !== newFile && tickCallback) {
      await tickCallback(oldFile, newFile)
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
    // Node IPC converts Buffer to array of ints
    if (typeof result.contents === 'object' && result.contents) {
      return {
        ...result,
        contents: Buffer.from(result.contents),
      }
    }
    return result
  }
  async report(issue: any): Promise<void> {
    await this.context.invokeIssueReporters(issue)
  }
}
