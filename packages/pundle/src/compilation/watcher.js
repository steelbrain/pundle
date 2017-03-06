/* @flow */

import invariant from 'assert'
import chokidar from 'chokidar'
import EventEmitter from 'events'

export default class Watcher extends EventEmitter {
  paths: Map<string, number>;
  chokidar: Object;

  constructor(config: Object) {
    super()
    this.paths = new Map()
    this.chokidar = chokidar.watch([], {
      usePolling: config.usePolling,
      ignoreInitial: true,
    })
    this.chokidar.on('add', filePath => this.emit('change', filePath))
    this.chokidar.on('unlink', filePath => this.emit('unlink', filePath))
    this.chokidar.on('change', filePath => this.emit('change', filePath))
  }
  watch(filePath: string): void {
    invariant(typeof filePath === 'string', 'filePath must be string')
    const count = this.paths.get(filePath) || 0
    const newCount = count + 1
    this.paths.set(filePath, newCount)

    if (newCount === 1) {
      this.chokidar.add(filePath)
    }
  }
  unwatch(filePath: string): void {
    invariant(typeof filePath === 'string', 'filePath must be string')
    const count = this.paths.get(filePath) || 0
    const newCount = count - 1
    if (newCount < 1) {
      this.chokidar.unwatch(filePath)
      this.paths.delete(filePath)
    }
  }
  getWatchedFiles(): Array<string> {
    return Array.from(this.paths.keys())
  }
  dispose() {
    this.paths.clear()
    this.chokidar.close()
    this.removeAllListeners()
  }
}
