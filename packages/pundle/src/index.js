'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { normalizeConfig } from './helpers'
import FileSystem from './file-system'
import Path from './path'
import type { Pundle$Config } from './types'
import type { Disposable } from 'sb-event-kit'

class Pundle {
  path: Path;
  config: Pundle$Config;
  emitter: Emitter;
  fileSystem: FileSystem;
  subscriptions: CompositeDisposable;

  constructor(config: Pundle$Config) {
    this.config = normalizeConfig(config)

    this.fileSystem = new FileSystem(new config.FileSystem(this.config))
    this.path = new Path(this.config, this.fileSystem)
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.path)
  }
  onCaughtError(callback: Function): Disposable {
    return this.emitter.on('caught-error', callback)
  }
  observeCompilations(callback: Function): Disposable {
    return this.emitter.on('observe-compilations', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
