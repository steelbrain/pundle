'use strict'

/* @flow */

import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import { watch } from 'chokidar'
import { normalizeWatcherConfig } from './helpers'
import type { WatcherConfig } from '../types'
import type Compilation from './index.js'

export default class Watcher {
  emitter: Emitter;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(compilation: Compilation) {
    this.emitter = new Emitter()
    this.compilation = compilation
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  watch(givenOptions: WatcherConfig): { disposable: Disposable, queue: Promise } {
    const options = normalizeWatcherConfig(givenOptions)
    const watcher = watch(this.compilation.config.rootDirectory, {
      depth: 10,
      ignored: options.ignored,
      ignoreInitial: true,
      followSymlinks: false,
      ignorePermissionErrors: true
    })
    const toReturn = {
      queue: Promise.resolve(),
      disposable: new Disposable(() => {
        this.subscriptions.remove(toReturn.disposable)
        watcher.close()
      })
    }
    watcher.on('ready', () => {
      toReturn.queue.then(() => {
        if (options.onReady) {
          options.onReady.call(this)
        }
      })
    })
    watcher.on('change', filePath => {
      let moduleId
      const referenceId = this.compilation.pundle.fileSystem.getValueByResolved(filePath)
      if (referenceId === '$root') {
        moduleId = referenceId
        filePath = this.compilation.pundle.path.out(moduleId)
      } else {
        moduleId = this.compilation.pundle.path.in(filePath)
      }
      if (!this.compilation.modules.registry.has(moduleId)) {
        return
      }
      toReturn.queue = toReturn.queue.then(() => {
        if (options.onBeforeCompile) {
          options.onBeforeCompile.call(this, filePath)
        }
        return this.compilation.modules.read(filePath).then(function() {
          if (options.onAfterCompile) {
            options.onAfterCompile.call(this, filePath, null)
          }
        }, function(error) {
          if (options.onAfterCompile) {
            options.onAfterCompile.call(this, filePath, error)
          }
          options.onError(error)
        })
      })
    })
    watcher.on('unlink', filePath => {
      const moduleId = this.compilation.pundle.path.in(filePath)
      const toDelete = []
      for (const entry of this.compilation.modules.registry.keys()) {
        if (entry.indexOf(moduleId) === 0) {
          toDelete.push(entry)
        }
      }
      for (const entry of toDelete) {
        this.compilation.modules.registry.delete(entry)
      }
    })

    this.subscriptions.add(toReturn.disposable)
    return toReturn
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
