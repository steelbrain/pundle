// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'

import { WORKER_REQUEST_TYPE } from '../constants'
import type Master from '../master'
import type { RunOptions, WorkerType, WorkerRequestType, WorkerJobType } from '../types'

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
  isAlive(): boolean {
    return !!(this.handle && this.bridge)
  }
  setMaster(master: $FlowFixMe) {
    this.master = master
  }
  async send<T>(type: WorkerRequestType, payload: Object): Promise<T> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    return bridge.send(type, payload)
  }
  async spawn() {
    if (this.isAlive()) {
      throw new Error(`Cannot spawn worker is still alive`)
    }

    const spawnedProcess = fork(path.join(__dirname, 'process'), [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
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
    spawnedProcess.on('exit', () => this.dispose())

    const response = await communication.send('init', { type: this.type, options: this.options })
    if (response !== 'ok') {
      throw new Error(`Got non-ok response from worker: ${response}`)
    }

    await this.handleRequests()
  }
  async handleRequests() {
    const { bridge, master } = this

    if (!bridge) {
      throw new Error('Cannot setupListeners() on a dead worker')
    }
    if (!master) {
      throw new Error('Cannot setupListeners() without a master')
    }
    bridge.on('request', async (request: { type: WorkerJobType }) => {
      const { type, ...args } = request
      if (!WORKER_REQUEST_TYPE.includes(type)) {
        throw new Error(`Invalid/Unrecognized request type: '${type}'`)
      }
      // TODO: Why won't flow complain if I compare an enum to an invalid string?
      if (type === 'resolve') {
        console.log('resolve request', args)
      }
    })
  }
  dispose() {
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
