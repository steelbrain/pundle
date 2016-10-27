/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'

import * as Helpers from './helpers'
import Compilation from './compilation'
import type { Config, Preset, ComponentConfig } from './types'

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
  async loadComponents(givenComponents: Array<ComponentConfig>): Promise<this> {
    if (!Array.isArray(givenComponents)) {
      throw new Error('Parameter 1 to loadComponents() must be an Array')
    }
    const components = await Helpers.getComponents(givenComponents, this.config.rootDirectory)
    components.forEach(({ component, config }) => {
      this.compilation.addComponent(component, config)
    })
    return this
  }
  async loadPreset(preset: Preset, config: Object = {}): Promise<this> {
    if (!Array.isArray(preset)) {
      throw new Error('Parameter 1 to loadPreset() must be an Array')
    }
    if (typeof config !== 'object' || !config) {
      throw new Error('Parameter 2 to loadPreset() must be an Object')
    }
    for (const entry of preset) {
      if (typeof entry !== 'object' || !entry
        || !entry.component || (typeof entry.component !== 'string' && typeof entry.component !== 'object')
        || !entry.config || typeof entry.config !== 'object'
        || !entry.name || typeof entry.name !== 'string') {
        throw new Error('Invalid preset entry given to loadPreset()')
      }
      const component = typeof entry.component === 'string' ? Helpers.resolveComponent(entry.component, this.config.rootDirectory) : entry.component
      const componentConfig = Object.assign({}, entry.config)
      if (config[entry.name]) {
        Object.assign(componentConfig, config[entry.name])
      }
      this.compilation.addComponent(component, componentConfig)
    }
    return this
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
