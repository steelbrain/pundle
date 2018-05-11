// @flow

import os from 'os'
import pMap from 'p-map'
import invariant from 'assert'
import promiseDefer from 'promise.defer'
import { PundleError, getChunk, type ResolveResult, type Chunk } from 'pundle-api'
import type { Config } from 'pundle-core-load-config'

import WorkerDelegate from '../worker/delegate'
import type { RunOptions } from '../types'

// TODO: Locks for files and chunks
export default class Master {
  config: Config
  options: RunOptions
  workers: Array<WorkerDelegate>
  queue: Array<{| payload: {}, resolve: Function, reject: Function |}>

  constructor(config: Config, options: RunOptions) {
    this.config = config
    this.options = options
    this.queue = []

    this.workers = [new WorkerDelegate('resolver', options)]
    os.cpus().forEach(() => {
      this.workers.push(new WorkerDelegate('processor', options))
    })
    this.workers.forEach(worker => {
      worker.setMaster(this)
    })
  }
  async spawnWorkers() {
    try {
      await Promise.all(
        this.workers.map(async worker => {
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
    this.workers.forEach(function(worker) {
      worker.dispose()
    })
  }
  report(issue: $FlowFixMe) {
    console.log('issue reported to master', issue)
  }

  async execute() {
    const entries = await Promise.all(this.config.entry.map(entry => this.resolve(entry)))
    const chunks = entries.map(entry => getChunk(entry.format, null, entry.resolved))
    const processed = await pMap(chunks, chunk => this.processChunk(chunk))
    console.log('processed', processed)
  }
  async processChunk(chunk: Chunk): Promise<void> {
    const { entry } = chunk
    if (!entry) {
      throw new Error('Cannot process chunk without entry')
    }

    const processedEntry = await this.queuedProcess({
      path: entry,
      format: 'js',
      resolved: true,
    })
    console.log('processedEntry', processedEntry)
  }
  async resolve(request: string, requestRoot: ?string = null, ignoredResolvers: Array<string> = []): Promise<ResolveResult> {
    const resolver = this.workers.find(worker => worker.type === 'resolver')
    const actualRequestRoot = requestRoot || this.config.rootDirectory

    invariant(resolver, 'resolver worker not found')

    return resolver.send('resolve', {
      request,
      requestRoot: actualRequestRoot,
      ignoredResolvers,
    })
  }
  // TODO: Don't queue a file again if it's already queued
  async queuedProcess(payload: { path: string, format: string, resolved: boolean }): Promise<void> {
    const currentWorker = this.workers.find(worker => worker.isWorking === 0)
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
