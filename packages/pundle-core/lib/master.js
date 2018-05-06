// @flow

import os from 'os'
import { PundleError } from 'pundle-api'
import type { Config } from 'pundle-core-load-config'

import WorkerDelegate from './worker-delegate'
import type { RunOptions } from './types'

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
      await Promise.all(this.workers.map(worker => worker.spawn()))
    } catch (error) {
      throw new PundleError('DAEMON', 'WORKER_CRASHED', null, null, `Worker crashed during initial spawn: ${error.message}`)
    }
  }
}
