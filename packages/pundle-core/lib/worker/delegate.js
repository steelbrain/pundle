// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'

import type Master from '../master'
import type { RunOptions, WorkerType, WorkerJobType } from '../types'

export default class Worker {
  type: WorkerType
  options: RunOptions
  master: Master
  handle: ?ChildProcess
  bridge: ?Communication
  isWorking: number

  constructor(type: WorkerType, options: RunOptions, master: Master) {
    this.type = type
    this.options = options
    this.master = master
    this.isWorking = 0
  }
  isAlive(): boolean {
    return !!(this.handle && this.bridge)
  }
  async send<T>(type: WorkerJobType, payload: Object, onTaskComplete?: () => void): Promise<T> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    const taskCompleted = () => {
      this.isWorking = this.isWorking > 0 ? this.isWorking - 1 : 0
      if (onTaskComplete) {
        onTaskComplete()
      }
    }

    this.isWorking++
    return bridge.send(type, payload).then(
      response => {
        taskCompleted()
        return response
      },
      error => {
        taskCompleted()
        throw error
      },
    )
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
    this.isWorking = 0
    spawnedProcess.on('exit', () => {
      // TODO: Notify master?
      this.dispose()
    })

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
    bridge.on('resolve', async params => master.resolve(params))
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
    this.isWorking = 0
  }
}
