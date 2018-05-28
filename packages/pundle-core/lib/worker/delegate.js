// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'
import type { Context, ImportResolved, ImportTransformed, ImportRequest } from 'pundle-api'

type Payload = {|
  context: Context,
  transformQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>,
  handleResolve: (request: ImportRequest) => Promise<ImportResolved>,
|}

export default class WorkerDelegate {
  handle: ?ChildProcess
  bridge: ?Communication
  options: Payload
  busyTransforming: number

  constructor(options: Payload) {
    this.options = options
    this.busyTransforming = 0
  }
  isAlive(): boolean {
    return !!(this.handle && this.bridge)
  }
  transformQueue(): void {
    const queueItem = this.options.transformQueue.pop()
    if (queueItem) {
      this.transform(queueItem.payload).then(queueItem.resolve, queueItem.reject)
    }
  }
  async transform(request: ImportResolved): Promise<ImportTransformed> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    this.busyTransforming++
    try {
      return await bridge.send('transform', request)
    } finally {
      this.busyTransforming--
      this.transformQueue()
    }
  }
  async resolve(request: ImportRequest): Promise<ImportResolved> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    return bridge.send('resolve', request)
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
    spawnedProcess.on('exit', () => {
      // TODO: Notify master?
      this.dispose()
    })

    const response = await communication.send('init', this.options.context.serialize())
    if (response !== 'ok') {
      throw new Error(`Got non-ok response from worker: ${response}`)
    }
    communication.on('resolve', this.options.handleResolve)
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
