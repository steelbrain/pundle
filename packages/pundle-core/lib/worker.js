// @flow

import promiseDefer from 'promise.defer'
import Communication from 'sb-communication'
import loadConfig from 'pundle-core-load-config'
import type { Config } from 'pundle-core-load-config'
import type { RunOptions, WorkerType } from './types'

export default class Worker {
  type: WorkerType
  config: Config
  options: RunOptions

  constructor(type: WorkerType, config: Config, options: RunOptions) {
    this.type = type
    this.config = config
    this.options = options
  }
}

if (process.env.PUNDLE_WORKER_PROCESS === 'TRUE') {
  process.title = 'pundle-worker'

  const init = promiseDefer()
  const communication = new Communication({
    listener(callback) {
      process.on('message', callback)
    },
    send(payload) {
      if (!process.send) {
        throw new Error('Cant start working when cant send to process. DUH.')
      }
      process.send(payload)
    },
  })
  communication.on('init', async function({ type, options }) {
    const config = await loadConfig(options)
    init.resolve(new Worker(type, config, options))
    return 'ok'
  })
}
