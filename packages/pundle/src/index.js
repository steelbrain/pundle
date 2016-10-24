/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import * as Helpers from './helpers'
import type { Config } from './types'

class Pundle {
  config: Config;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
