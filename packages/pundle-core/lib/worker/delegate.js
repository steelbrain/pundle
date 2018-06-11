// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'
import type { Context, ImportResolved, ImportTransformed, ImportRequest } from 'pundle-api'

type Payload = {|
  // eslint-disable-next-line no-use-before-define
  queue: Array<(worker: WorkerDelegate) => void>,
  context: Context,
  handleResolve: (request: ImportRequest) => Promise<ImportResolved>,
|}

export default class WorkerDelegate {
  handle: ?ChildProcess
  bridge: ?Communication
  options: Payload
  busyProcessing: number

  constructor(options: Payload) {
    this.options = options
    this.busyProcessing = 0
  }
  isAlive(): boolean {
    return !!(this.handle && this.bridge)
  }
  processQueue(): void {
    if (this.busyProcessing > 0) return

    const queueItem = this.options.queue.pop()
    if (queueItem) {
      queueItem(this)
    }
  }
  async transformFile(request: ImportResolved): Promise<ImportTransformed> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    this.busyProcessing++
    try {
      return await bridge.send('transform', request)
    } finally {
      this.busyProcessing--
      this.processQueue()
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
