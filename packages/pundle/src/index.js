'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { normalizeConfig } from './helpers'
import Path from './path'
import type { Pundle$Config, Pundle$FileSystem } from './types'

class Pundle {
  path: Path;
  config: Pundle$Config;
  emitter: Emitter;
  fileSystem: Pundle$FileSystem;
  subscriptions: CompositeDisposable;

  constructor(config: Pundle$Config) {
    this.config = normalizeConfig(config)

    this.path = new Path(this.config)
    this.emitter = new Emitter()
    this.fileSystem = new config.FileSystem(this.config)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
