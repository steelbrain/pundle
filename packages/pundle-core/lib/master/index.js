// @flow

import os from 'os'
import pMap from 'p-map'
import promiseDefer from 'promise.defer'
import PromiseQueue from 'sb-promise-queue'
import differenceBy from 'lodash/differenceBy'
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

    return this.generate(await this.transformJob(job))
  }
  async generate(job: Job, chunks: Array<Chunk> = Array.from(job.chunks.values())): Promise<ChunksGenerated> {
    return this.context.invokeChunkGenerators(this, { job, chunks })
  }
  async transformJob(job: Job): Promise<Job> {
    return this.context.invokeJobTransformers(this, { job })
  }
  async transformChunk(
    chunk: Chunk,
    job: Job,
    tickCallback: ?TickCallback = null,
    forcedOverwrite: Array<string> = [],
  ): Promise<void> {
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

      const filesToProcess = chunk.imports.slice()
      if (chunk.entry) {
        filesToProcess.push({ format: chunk.format, filePath: chunk.entry })
      }
      await pMap(filesToProcess, file => this.transformFileTree(file, job, tickCallback, forcedOverwrite))
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
    forcedOverwrite: Array<string> = [],
  ): Promise<void> {
    const lockKey = getFileKey(request)
    const oldFile = job.files.get(lockKey)
    if (job.locks.has(lockKey)) {
      return
    }
    if (oldFile && !forcedOverwrite.includes(request.filePath)) {
      return
    }
    job.locks.add(lockKey)

    try {
      const newFile = await this.transform(request)
      job.files.set(lockKey, newFile)
      await Promise.all([
        pMap(newFile.imports, fileImport => this.transformFileTree(fileImport, job, tickCallback, forcedOverwrite)),
        pMap(newFile.chunks, fileChunk => this.transformChunk(fileChunk, job, tickCallback, forcedOverwrite)),
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
  async watch({ adapter = 'chokidar', tick, ready, generate }: WatchOptions = {}): Promise<{
    job: Job,
    queue: Object,
    context: Context,
    dispose(): void,
  }> {
    const job = new Job()
    const { context } = this
    const queue = new PromiseQueue()

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
      if (oldFile) {
        const removedChunks = differenceBy(oldFile.chunks, newFile.chunks, getChunkKey)
        const removedImports = differenceBy(oldFile.imports, newFile.imports, getFileKey)
        removedImports.forEach((fileImport: ImportResolved) => {
          const fileImportKey = getFileKey(fileImport)
          let found = configChunks.find(chunk => getFileKey(chunk) === fileImportKey)
          if (found) {
            // DO NOT DELETE ENTRIES
            return
          }
          job.files.forEach((file: ImportTransformed) => {
            found = found || file.imports.some(item => getFileKey(item) === fileImportKey) !== -1
          })
          if (!found) {
            job.files.delete(fileImportKey)
          }
        })
        removedChunks.forEach((chunk: Chunk) => {
          const chunkKey = getChunkKey(chunk)
          let found = configChunks.find(configChunk => getChunkKey(configChunk) === chunkKey)
          if (found) {
            // DO NOT DELETE ENTRIES
            return
          }
          job.files.forEach((file: ImportTransformed) => {
            found = found || file.chunks.some(item => getChunkKey(item) === chunkKey)
          })
          if (!found) {
            job.chunks.delete(chunkKey)
          }
        })
      }
      try {
        if (tick) {
          tick({ context, job, oldFile, newFile })
        }
      } catch (error) {
        await this.report(error)
      }
    }

    const onChange = async filePath => {
      const parents = { imports: [], chunks: [] }
      const forcedOverwrite = [filePath]

      function findInImports(imports: Array<ImportResolved>) {
        return imports.find(resolved => resolved.filePath === filePath)
      }

      job.files.forEach(file => {
        if (
          findInImports(file.imports) ||
          file.chunks.some(chunk => chunk.entry === filePath || findInImports(chunk.imports))
        ) {
          forcedOverwrite.push(file.filePath)
          parents.imports.push({ format: file.format, filePath: file.filePath })
        }
      })
      configChunks.forEach(chunk => {
        const found = findInImports(chunk.imports)
        if (chunk.entry === filePath || found) {
          parents.chunks.push(chunk)
          if (found) {
            forcedOverwrite.push(found.filePath)
          } else if (chunk.entry) {
            forcedOverwrite.push(chunk.entry)
          }
        }
      })

      await Promise.all(
        []
          .concat(parents.chunks.map(chunk => this.transformChunk(chunk, job, tickCallback, forcedOverwrite)))
          .concat(parents.imports.map(request => this.transformFileTree(request, job, tickCallback, forcedOverwrite))),
      )

      return parents.chunks.length || parents.imports.length
    }

    let shouldGenerate = false
    queue.onIdle(() => {
      if (shouldGenerate && generate) {
        shouldGenerate = false
        try {
          Promise.resolve(generate({ context, job })).catch(error => this.report(error))
        } catch (error) {
          this.report(error)
        }
      }
    })

    const watcher = getWatcher(adapter, this.context.config.rootDirectory, filePath => {
      queue
        .add(() =>
          onChange(filePath).then(processed => {
            if (processed) shouldGenerate = true
          }),
        )
        .catch(error => this.report(error))
    })
    await pMap(configChunks, chunk => this.transformChunk(chunk, job, tickCallback))

    if (ready) {
      await ready({ context, job })
    }
    if (generate) {
      await generate({ context, job })
    }
    await watcher.watch()

    return {
      job,
      queue,
      context,
      dispose() {
        watcher.close()
      },
    }
  }
}
