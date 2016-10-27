/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { File } from 'pundle-api/types'

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
  async loadPreset(givenPreset: Preset | string, config: Object = {}): Promise<this> {
    if ((!Array.isArray(givenPreset) && typeof givenPreset !== 'string') || !givenPreset) {
      throw new Error('Parameter 1 to loadPreset() must be an Array or String')
    }
    if (typeof config !== 'object' || !config) {
      throw new Error('Parameter 2 to loadPreset() must be an Object')
    }
    let preset = givenPreset
    if (typeof preset === 'string') {
      preset = await Helpers.getComponent(preset, this.config.rootDirectory)
    }

    for (const entry of preset) {
      if (typeof entry !== 'object' || !entry
        || !entry.component || (typeof entry.component !== 'object' && typeof entry.component !== 'string')
        || !entry.config || typeof entry.config !== 'object'
        || !entry.name || typeof entry.name !== 'string') {
        throw new Error('Invalid preset entry given to loadPreset()')
      }
      const component = typeof entry.component === 'string' ? await Helpers.getComponent(entry.component, this.config.rootDirectory) : entry.component
      const componentConfig = Object.assign({}, entry.config)
      if (config[entry.name]) {
        Object.assign(componentConfig, config[entry.name])
      }
      this.compilation.addComponent(component, componentConfig)
    }
    return this
  }
  processFile(request: string, from: ?string, cached: boolean = true): Promise<File> {
    return this.compilation.processFile(request, from, cached)
  }
  resolve(request: string, from: ?string, cached: boolean = true): Promise<string> {
    return this.compilation.resolve(request, from, cached)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
