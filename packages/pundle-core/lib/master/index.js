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

type ChangedFiles = Map<string, ImportResolved>
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
  // TODO: Use cached old files here if present on the job?
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
    const oldFile = job.files.get(lockKey)

    if (locks.has(lockKey)) {
      return
    }
    locks.add(lockKey)

    let newFile
    if (oldFile && !changedImports.has(lockKey)) {
      newFile = oldFile
    } else {
      changedImports.delete(lockKey)
      newFile = await this.transform(request)
      job.files.set(lockKey, newFile)
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
    if (oldFile !== newFile && tickCallback) {
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
    await this.context.invokeIssueReporters(this, issue)
  }
  // Dangerous territory beyond this point. May God help us all
  async watch({ adapter = 'nsfw', tick, generate }: WatchOptions = {}): Promise<{
    job: Job,
    queue: Object,
    context: Context,
    initialCompile(): Promise<void>,
    dispose(): void,
  }> {
    const job = new Job()
    const { context } = this
    const queue = new PromiseQueue()
    let initialCompilePromise = null

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
      let removedChunks = []
      let removedImports = []
      if (oldFile) {
        removedChunks = differenceBy(oldFile.chunks, newFile.chunks, getChunkKey)
        removedImports = differenceBy(oldFile.imports, newFile.imports, getFileKey)
      }
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
      try {
        if (tick) {
          tick({ context, job, oldFile, newFile })
        }
      } catch (error) {
        await this.report(error)
      }
    }

    const changed: ChangedFiles = new Map()
    // eslint-disable-next-line no-unused-vars
    const onChange = async (event, filePath, newPath) => {
      if (event === 'delete') {
        job.files.forEach((file, key) => {
          if (file.filePath === filePath) {
            job.files.delete(key)
          }
        })
      }

      function processChunk(chunk: Chunk) {
        if (chunk.entry && chunk.entry === filePath) {
          const chunkImport = { format: chunk.format, filePath: chunk.entry }
          changed.set(getFileKey(chunkImport), chunkImport)
        }
        if (chunk.imports.length) {
          chunk.imports.forEach(chunkImport => {
            if (chunkImport.filePath === filePath) {
              changed.set(getFileKey(chunkImport), chunkImport)
            }
          })
        }
      }
      function processFile(file: ImportTransformed) {
        if (file.filePath !== filePath && !file.imports.some(item => item.filePath === filePath)) return

        const fileImport = { format: file.format, filePath: file.filePath }
        const fileKey = getFileKey(fileImport)
        if (changed.has(fileKey)) return

        changed.set(fileKey, fileImport)
        file.chunks.forEach(processChunk)
      }

      configChunks.forEach(processChunk)
      job.files.forEach(file => {
        file.chunks.forEach(chunk => {
          processChunk(chunk)
        })
        processFile(file)
      })
    }

    queue.onIdle(async () => {
      if (!generate || !changed.size || !initialCompilePromise) return

      await initialCompilePromise

      const currentChanged = new Map(changed)
      const currentChangedVals = Array.from(currentChanged.values())
      changed.clear()

      try {
        const locks = new Set()
        await Promise.all(
          currentChangedVals.map(request =>
            this.transformFileTree({
              job,
              locks,
              request,
              tickCallback,
              changedImports: currentChanged,
            }),
          ),
        )
        queue.add(() => generate({ context, job, changed: currentChangedVals })).catch(error => this.report(error))
      } catch (error) {
        this.report(error)
      }
    })

    const watcher = getWatcher(adapter, this.context.config.rootDirectory, (...args) => {
      queue.add(() => onChange(...args)).catch(error => this.report(error))
    })

    await watcher.watch()

    return {
      job,
      queue,
      context,
      initialCompile: () => {
        if (!initialCompilePromise) {
          initialCompilePromise = pMap(configChunks, chunk =>
            this.transformChunk({
              job,
              chunk,
              locks: new Set(),
              tickCallback,
            }),
          ).catch(error => {
            initialCompilePromise = null
            throw error
          })
        }
        return initialCompilePromise
      },
      dispose() {
        watcher.close()
      },
    }
  }
}
