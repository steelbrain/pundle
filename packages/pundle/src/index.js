/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'
import * as Helpers from './helpers'
import applyLoaders from './loaders'
import Resolver from './resolver'
import PundlePath from './path'
import type { Config, State } from './types'

@Resolver.attach
@PundlePath.attach
class Pundle {
  path: PundlePath;
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
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    applyLoaders(this)
  }
  async read(givenFilePath: string, from: string): Promise<void> {
    const filePath = this.path.in(givenFilePath)
    console.log(from, filePath)
  }
  async compile(): Promise<void> {
    await Promise.all(this.config.entry.map(entry => this.read(entry, '$root')))
  }
  onError(callback: Function): Disposable {
    return this.emitter.on('error', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
