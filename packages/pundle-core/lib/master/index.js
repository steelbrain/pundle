// @flow

import os from 'os'
import invariant from 'assert'
import { PundleError, getChunk, type ResolveResult } from 'pundle-api'
import type { Config } from 'pundle-core-load-config'

import WorkerDelegate from '../worker/delegate'
import type { RunOptions } from '../types'

export default class Master {
  config: Config
  options: RunOptions
  workers: Array<WorkerDelegate>

  constructor(config: Config, options: RunOptions) {
    this.config = config
    this.options = options

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
    console.log('chunks', chunks)
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
}
