/* @flow */

import invariant from 'assert'
import chokidar from 'chokidar'
import { EventEmitter } from 'events'
import type { WatcherConfig } from '../../types'

export default class Watcher extends EventEmitter {
  paths: Map<string, number>;
  active: boolean;
  config: WatcherConfig;
  disabled: Set<string>;
  chokidar: Object;

  constructor(initialFiles: Array<string>, config: WatcherConfig) {
    super()
    this.paths = new Map()
    this.active = true
    this.config = config
    this.disabled = new Set()
    this.chokidar = chokidar.watch([], {
      usePolling: config.usePolling,
      ignoreInitial: true,
    })
    this.chokidar.on('add', filePath => !this.disabled.has(filePath) && this.emit('change', filePath))
    this.chokidar.on('unlink', filePath => !this.disabled.has(filePath) && this.emit('unlink', filePath))
    this.chokidar.on('change', filePath => !this.disabled.has(filePath) && this.emit('change', filePath))

    setImmediate(() => {
      initialFiles.forEach(file => this.watch(file))
    })
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
  unwatch(filePath: string, force: boolean = false): void {
    invariant(typeof filePath === 'string', 'filePath must be string')
    const count = this.paths.get(filePath) || 0
    const newCount = count - 1
    if (newCount < 1 || force) {
      this.chokidar.unwatch(filePath)
      this.paths.delete(filePath)
    }
  }
  enable(filePath: string): void {
    this.disabled.delete(filePath)
  }
  disable(filePath: string): void {
    this.disabled.add(filePath)
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
