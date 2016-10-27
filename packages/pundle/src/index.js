/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'

import * as Helpers from './helpers'
import Compilation from './compilation'
import type { Config, ConfigComponent } from './types'

class Pundle {
  config: Config;
  emitter: Emitter;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.compilation = new Compilation(this.config)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.compilation)
  }
  async load(givenComponents: Array<ConfigComponent>): Promise<this> {
    if (!Array.isArray(givenComponents)) {
      throw new Error('Parameter 1 to load() must be an Array')
    }
    const components = await Helpers.getComponents(givenComponents, this.config.rootDirectory)
    components.forEach(({ component, config }) => {
      this.compilation.addComponent(component, config)
    })
    return this
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
