// @flow

import path from 'path'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'

import type Master from './master'
import type { RunOptions, WorkerType } from './types'

export default class Worker {
  type: WorkerType
  options: RunOptions
  master: ?Master
  handle: ?ChildProcess
  bridge: ?Communication

  constructor(type: WorkerType, options: RunOptions) {
    this.type = type
    this.options = options
    this.master = null
  }
  setMaster(master: Master) {
    this.master = master
  }
  async spawn() {
    const spawnedProcess = fork(path.join(__dirname, 'worker'), [], {
      env: {
        ...process.env,
        PUNDLE_WORKER_PROCESS: 'TRUE',
      },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    })
    const communication = new Communication({
      listener(callback) {
        spawnedProcess.on('message', callback)
      },
      send(payload) {
        spawnedProcess.send(payload)
      },
    })
    this.handle = spawnedProcess
    this.bridge = communication

    const response = await communication.send('init', { type: this.type, options: this.options })
    if (response !== 'ok') {
      throw new Error(`Got non-ok response from worker: ${response}`)
    }
  }
  async kill() {
    if (this.handle) {
      this.handle.kill()
      this.handle = null
    }
    if (this.bridge) {
      this.bridge.dispose()
      this.bridge = null
    }
  }
}
