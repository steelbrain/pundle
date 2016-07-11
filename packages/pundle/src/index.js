/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'
import * as Helpers from './helpers'
import applyLoaders from './loaders'
import type { Config, State } from './types'

class Pundle {
  state: State;
  config: Config;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.state = {
      loaders: new Map(),
    }
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    applyLoaders(this)
  }
  onError(callback: Function): Disposable {
    return this.emitter.on('error', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
