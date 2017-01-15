/* @flow */

import chokidar from 'chokidar'
import { EventEmitter } from 'events'
import type { WatcherConfig } from '../../types'

export default class Watcher extends EventEmitter {
  paths: Map<string, number>;
  active: boolean;
  config: WatcherConfig;
  chokidar: Object;

  constructor(initialFiles: Array<string>, config: WatcherConfig) {
    super()
    this.paths = new Map()
    this.active = true
    this.config = config
    this.chokidar = chokidar.watch([], {
      usePolling: config.usePolling,
    })
    this.chokidar.on('unlink', filePath => this.emit('unlink', filePath))
    this.chokidar.on('change', filePath => this.emit('change', filePath))

    setImmediate(() => {
      initialFiles.forEach(file => this.watch(file))
    })
  }
  watch(filePath: string): void {
    const count = this.paths.get(filePath) || 0
    const newCount = count + 1
    this.paths.set(filePath, newCount)

    if (newCount === 1) {
      this.chokidar.add(filePath)
    }
  }
  unwatch(filePath: string): void {
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
