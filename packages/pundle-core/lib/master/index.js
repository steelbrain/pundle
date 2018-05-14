// @flow

import os from 'os'
import pMap from 'p-map'
import promiseDefer from 'promise.defer'
import {
  PundleError,
  getChunk,
  type Chunk,
  type ImportResolved,
  type ImportRequest,
  type ComponentFileResolverResult,
} from 'pundle-api'
import type { Config } from 'pundle-core-load-config'

import WorkerDelegate from '../worker/delegate'
import type { RunOptions } from '../types'

// TODO: Locks for files and chunks
export default class Master {
  config: Config
  options: RunOptions
  resolverWorker: WorkerDelegate
  generatorWorker: WorkerDelegate
  processorWorkers: Array<WorkerDelegate>
  queue: Array<{| payload: {}, resolve: Function, reject: Function |}>

  constructor(config: Config, options: RunOptions) {
    this.config = config
    this.options = options
    this.queue = []

    this.resolverWorker = new WorkerDelegate('resolver', options)
    this.generatorWorker = new WorkerDelegate('generator', options)
    this.processorWorkers = os.cpus().map(() => new WorkerDelegate('processor', options))

    this.getAllWorkers().forEach(worker => {
      worker.setMaster(this)
    })
  }
  getAllWorkers(): Array<WorkerDelegate> {
    return [this.resolverWorker, this.generatorWorker].concat(this.processorWorkers)
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

  async execute() {
    const entries = await Promise.all(
      this.config.entry.map(entry =>
        this.resolve({
          request: entry,
          requestRoot: this.config.rootDirectory,
          ignoredResolvers: [],
        }),
      ),
    )
    const chunks = entries.map(entry => getChunk(entry.format, null, entry.resolved))
    const processed = await pMap(chunks, chunk => this.processChunk(chunk))
    console.log('processed', processed)
  }
  async processChunk(chunk: Chunk): Promise<void> {
    const { entry } = chunk
    if (!entry) {
      // TODO: Return silently instead?
      throw new Error('Cannot process chunk without entry')
    }

    const processedTree = await this.processFileTree({
      format: 'js',
      filePath: entry,
    })
    console.log('processedTree', processedTree)
  }
  async processFileTree(request: ImportResolved): Promise<void> {
    const processedEntry = await this.queuedProcess(request)
    console.log('processedEntry', processedEntry)
  }
  async resolve(request: ImportRequest): Promise<ComponentFileResolverResult> {
    return this.resolverWorker.send('resolve', request)
  }
  // TODO: Don't queue a file again if it's already queued
  async queuedProcess(payload: ImportResolved): Promise<$FlowFixMe> {
    const currentWorker = this.processorWorkers.find(worker => worker.isWorking === 0)
    if (currentWorker) {
      return currentWorker.send('process', payload, () => {
        const itemToProcess = this.queue.pop()
        if (itemToProcess) {
          currentWorker.send('process', itemToProcess.payload).then(itemToProcess.resolve, itemToProcess.reject)
        }
      })
    }
    const deferred = promiseDefer()
    this.queue.push({
      payload,
      resolve: deferred.resolve,
      reject: deferred.reject,
    })
    return deferred.promise
  }
}
