// @flow

import { Context } from 'pundle-api'
import promiseDefer from 'promise.defer'
import Communication from 'sb-communication'
import loadConfig, { type Config } from 'pundle-core-load-config'

import Worker from './'

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
communication.on('init', async function(options) {
  const context: Context<Config> = new Context({
    config: ({}: Object),
    ...options,
  })
  context.config = await loadConfig(context)
  init.resolve(new Worker(context, communication))
  return 'ok'
})
init.promise.then((worker: Worker) => {
  communication.on('resolve', payload => worker.resolve(payload))
  communication.on('process', payload => worker.process(payload))
})
