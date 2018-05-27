// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'
import type { Config } from 'pundle-core-load-config'
import type { Context, ImportResolved, WorkerProcessResult, ImportRequest, ComponentFileResolverResult } from 'pundle-api'

type Payload = {|
  context: Context<Config>,
  processQueue: Array<{| payload: ImportResolved, resolve: Function, reject: Function |}>,
  handleResolve: (request: ImportRequest) => Promise<ComponentFileResolverResult>,
|}

export default class WorkerDelegate {
  handle: ?ChildProcess
  bridge: ?Communication
  busyProcessing: number
  options: Payload

  constructor(options: Payload) {
    this.busyProcessing = 0
    this.options = options
  }
  isAlive(): boolean {
    return !!(this.handle && this.bridge)
  }
  processQueue(): void {
    const queueItem = this.options.processQueue.pop()
    if (queueItem) {
      this.process(queueItem.payload).then(queueItem.resolve, queueItem.reject)
    }
  }
  async process(request: ImportResolved): Promise<WorkerProcessResult> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    this.busyProcessing++
    try {
      return await bridge.send('process', request)
    } finally {
      this.busyProcessing--
      this.processQueue()
    }
  }
  async resolve(request: ImportRequest): Promise<ComponentFileResolverResult> {
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
