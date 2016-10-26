/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { ComponentAny } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { Config, ConfigComponent } from './types'

class Pundle {
  config: Config;
  emitter: Emitter;
  components: Array<{ component: ComponentAny, config: Object }>
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.components = []
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  async load(components: Array<ConfigComponent>): Promise<this> {
    if (!Array.isArray(components)) {
      throw new Error('Parameter 1 to load() must be an Array')
    }
    this.components = this.components.concat(await Helpers.getComponents(components, this.config.rootDirectory))
    return this
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
