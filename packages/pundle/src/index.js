/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { File } from 'pundle-api/types'
import type { Disposable } from 'sb-event-kit'

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
  // Spec:
  // - If preset is given as string, resolve/require that
  // - Validate preset export to be an Array
  // - Validate config to be an object
  // - When iterating over preset entries:
  //   - Validate each entry
  //   - If given config has "false" as value of a preset component, skip it
  //   - if component is string, resolve/require it
  //   - Merge given config of that component with preset config of that component
  //   - Store it in components list
  async loadPreset(givenPreset: Preset | string, config: Object = {}): Promise<this> {
    let preset = givenPreset
    if (typeof preset === 'string') {
      preset = await Helpers.getComponent(preset, this.config.rootDirectory)
    }
    if (!Array.isArray(preset)) {
      throw new Error('Invalid preset value/export. It must be an Array')
    }
    if (typeof config !== 'object' || !config) {
      throw new Error('Parameter 2 to loadPreset() must be an Object')
    }

    for (const entry of preset) {
      if (typeof entry !== 'object' || !entry
        || !entry.component || (typeof entry.component !== 'object' && typeof entry.component !== 'string')
        || !entry.config || typeof entry.config !== 'object'
        || !entry.name || typeof entry.name !== 'string') {
        throw new Error('Invalid preset entry given to loadPreset()')
      }
      if (config[entry.name] === false) {
        continue
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
  async generate(givenFiles: ?Array<File>, runtimeConfig: Object = {}): Promise<Object> {
    const files = givenFiles || await this.processTree()
    return await this.compilation.generate(files, runtimeConfig)
  }
  // Spec:
  // - Normalize all givenRequests to an array
  // - Asyncly and con-currently process all trees
  // - Share files cache between tree resolutions to avoid duplicates
  async processTree(givenRequest: ?string, givenFrom: ?string, cached: boolean = true): Promise<Array<File>> {
    let requests
    const files: Map<string, File> = new Map()
    if (!givenRequest) {
      requests = this.config.entry
    } else if (typeof givenRequest === 'string') {
      requests = [givenRequest]
    } else if (!Array.isArray(givenRequest)) {
      throw new Error('Parameter 1 to processTree() must be null, String or an Array')
    } else {
      requests = givenRequest
    }

    await Promise.all(requests.map(request =>
      this.compilation.processTree(request, givenFrom, cached, files)
    ))

    return Array.from(files.values())
  }
  processFile(request: string, from: ?string, cached: boolean = true): Promise<File> {
    return this.compilation.processFile(request, from, cached)
  }
  resolve(request: string, from: ?string, cached: boolean = true): Promise<string> {
    return this.compilation.resolve(request, from, cached)
  }
  watch(config: Object = {}): Promise<Disposable> {
    return this.compilation.watch(config)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
