// @flow

import path from 'path'
import invariant from 'assert'
import Communication from 'sb-communication'
import { fork, type ChildProcess } from 'child_process'
import type {
  Context,
  ImportResolved,
  ImportTransformed,
  ImportRequest,
  ChunkGenerated,
  ComponentFileResolverResult,
  ComponentChunkTransformerResult,
} from '@pundle/api'
import { processPayload, processReceived } from '../helpers'

type Payload = {|
  // eslint-disable-next-line no-use-before-define
  queue: Array<(worker: WorkerDelegate) => void>,
  context: Context,
  handleResolve: (request: ImportRequest) => Promise<ComponentFileResolverResult>,
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
      const result = await bridge.send('transform', processPayload(request))
      return processReceived(result, {
        buffers: ['contents'],
      })
    } finally {
      this.busyProcessing--
      this.processQueue()
    }
  }
  async transformChunkGenerated(chunkGenerated: ChunkGenerated): Promise<ComponentChunkTransformerResult> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    this.busyProcessing++
    try {
      const result = await bridge.send('transformChunkGenerated', processPayload(chunkGenerated))
      return processReceived(result, {
        buffers: ['contents', 'sourceMap.contents'],
      })
    } finally {
      this.busyProcessing--
      this.processQueue()
    }
  }
  async resolve(request: ImportRequest): Promise<ComponentFileResolverResult> {
    const { bridge } = this
    invariant(bridge, 'Cannot send job to dead worker')

    const result = await bridge.send('resolve', processPayload(request))
    return processReceived(result)
  }
  async spawn() {
    if (this.isAlive()) {
      throw new Error(`Cannot spawn worker is still alive`)
    }

    const argv = process.execArgv.filter(v => !v.startsWith('--inspect') && !v.startsWith('--debug'))
    const spawnedProcess = fork(path.join(__dirname, 'process'), argv, {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      execArgv: argv,
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
