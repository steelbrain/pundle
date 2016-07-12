/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'
import * as Helpers from './helpers'
import applyLoaders from './loaders'
import Resolver from './resolver'
import type { Config, State } from './types'

class Pundle {
  state: State;
  config: Config;
  emitter: Emitter;
  resolver: Resolver;
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.state = {
      loaders: new Map(),
    }
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.resolver = new Resolver(this.state, this.config)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.resolver)
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
