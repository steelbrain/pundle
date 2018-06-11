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
  type ChunkGenerated,
  type ComponentChunkTransformerResult,
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
  workersQueue: Array<(worker: WorkerDelegate) => void>

  constructor(context: Context) {
    this.cache = new Cache(context)
    this.context = context
    this.workersQueue = []

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
      queue: this.workersQueue,
      context: this.context,
      handleResolve: req => this.resolve(req),
    })
  }
  getAllWorkers(): Array<WorkerDelegate> {
    return [this.resolverWorker].concat(this.transformWorkers)
  }
  async _queuedProcess<T>(callback: (worker: WorkerDelegate) => Promise<T>): Promise<T> {
    const currentWorker = this.transformWorkers.find(worker => worker.busyProcessing === 0)

    let promise
    if (currentWorker) {
      promise = callback(currentWorker)
    } else {
      const { promise: deferredPromise, resolve, reject } = promiseDefer()
      this.workersQueue.push(worker => {
        callback(worker).then(resolve, reject)
      })
      promise = deferredPromise
    }

    return promise
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
    const { directory, outputs } = await this.context.invokeChunkGenerators(this, { job, chunks })
    const transformedOutputs = await pMap(outputs, async output => ({
      ...output,
      contents: (await this.transformChunkGenerated(output)).contents,
    }))

    return { directory, outputs: transformedOutputs }
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
      newFile = await this.transformFile(request)
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
  async transformChunkGenerated(
    chunkGenerated: ChunkGenerated,
    threaded: boolean = false,
  ): Promise<ComponentChunkTransformerResult> {
    if (!threaded) {
      return this.context.invokeChunkTransformers(this, chunkGenerated)
    }

    const result = await this._queuedProcess(worker => worker.transformChunkGenerated(chunkGenerated))
    // Node IPC converts Buffer to array of ints
    if (typeof result.contents === 'object' && result.contents) {
      result.contents = Buffer.from(result.contents)
    }
    if (result.sourceMap && typeof result.sourceMap.contents === 'object' && result.sourceMap.contents) {
      // $FlowFixMe deep prop access paranoia?
      result.sourceMap.contents = Buffer.from(result.sourceMap.contents)
    }
    return result
  }
  // PundleWorker methods below
  async resolve(request: ImportRequest): Promise<ImportResolved> {
    return this.resolverWorker.resolve(request)
  }
  async transformFile(payload: ImportResolved): Promise<ImportTransformed> {
    const result = await this._queuedProcess(worker => worker.transformFile(payload))
    // Node IPC converts Buffer to array of ints
    if (typeof result.contents === 'object' && result.contents) {
      result.contents = Buffer.from(result.contents)
    }
    return result
  }
  async report(issue: any): Promise<void> {
    await this.context.invokeIssueReporters(issue)
  }
}
