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
        })
      }).catch(options.onError)
    })

    this.subscriptions.add(toReturn.disposable)
    return toReturn
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
