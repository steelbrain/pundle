/* @flow */

import watchr from 'watchr'
import invariant from 'assert'
import { EventEmitter } from 'events'
import type { WatcherConfig } from '../../types'

export default class Watcher extends EventEmitter {
  paths: Map<string, number>;
  config: WatcherConfig;
  watchers: Map<string, Object>;

  constructor(initialFiles: Array<string>, config: WatcherConfig) {
    super()
    this.paths = new Map()
    this.config = config
    this.watchers = new Map()

    initialFiles.forEach(file => this.watch(file))
  }
  watch(filePath: string): void {
    const count = this.paths.get(filePath) || 0
    this.paths.set(filePath, count)

    if (!this.watchers.has(filePath)) {
      const watcher = watchr.create(filePath)
      watcher.setConfig({
        interval: 100,
        followLinks: true,
        catchupDelay: 5,
        preferredMethods: this.config.usePolling ? ['watchFile'] : ['watch', 'watchFile'],
      })
      watcher.on('change', (type) => this.emit(type === 'update' ? 'change' : 'unlink', filePath))
      watcher.watch({}, function() {})
      this.watchers.set(filePath, watcher)
    }
  }
  unwatch(filePath: string): void {
    const count = this.paths.get(filePath) || 0
    if (count === 0) {
      return
    }
    if (count > 1) {
      this.paths.set(filePath, count - 1)
      return
    }
    const watcher = this.watchers.get(filePath)

    invariant(watcher)
    watcher.close()
    this.paths.delete(filePath)
    this.watchers.delete(filePath)
  }
  getWatchedFiles(): Array<string> {
    return Array.from(this.paths.keys())
  }
  dispose() {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.paths.clear()
    this.watchers.clear()
  }
}
