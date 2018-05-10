// @flow

import promiseDefer from 'promise.defer'
import Communication from 'sb-communication'
import loadConfig from 'pundle-core-load-config'

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
communication.on('init', async function({ type, options }) {
  const config = await loadConfig(options)
  init.resolve(new Worker(type, config, options))
  return 'ok'
})
init.promise.then((worker: Worker) => {
  communication.on('resolve', payload => worker.resolve(payload))
})
