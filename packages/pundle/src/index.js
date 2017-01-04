/* @flow */

import invariant from 'assert'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { File, ComponentAny } from 'pundle-api/types'
import type { Disposable } from 'sb-event-kit'

import * as Helpers from './helpers'
import Compilation from './compilation'
import type { PundleConfig, Preset, Loadable } from '../types'

const UNIQUE_SIGNATURE_OBJ = {}

class Pundle {
  config: PundleConfig;
  emitter: Emitter;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(signature: typeof UNIQUE_SIGNATURE_OBJ, config: PundleConfig) {
    if (signature !== UNIQUE_SIGNATURE_OBJ) {
      throw new Error('Direct constructor call not allowed. Use Pundle.create() instead')
    }

    this.config = config
    this.emitter = new Emitter()
    this.compilation = new Compilation(config.compilation)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.compilation)
  }
  async loadComponents(givenComponents: Array<Loadable<ComponentAny>>): Promise<CompositeDisposable> {
    if (!Array.isArray(givenComponents)) {
      throw new Error('Parameter 1 to loadComponents() must be an Array')
    }
    const components = await Helpers.getLoadables(givenComponents, this.config.compilation.rootDirectory)
    const subscriptions = new CompositeDisposable()
    subscriptions.add(...components.map(([component, config]) => this.compilation.addComponent(component, config)))
    return subscriptions
  }
  // Notes:
  // - False in a preset config for a component means ignore it
  // - Component config given takes presedence over preset component config
  async loadPreset(givenPreset: Preset | string, presetConfig: Object = {}): Promise<CompositeDisposable> {
    let preset = givenPreset
    if (typeof preset === 'string') {
      preset = await Helpers.resolve(preset, this.config.compilation.rootDirectory)
    }
    if (!Array.isArray(preset)) {
      throw new Error('Invalid preset value/export. It must be an Array')
    }
    if (typeof presetConfig !== 'object' || !presetConfig) {
      throw new Error('Parameter 2 to loadPreset() must be an Object')
    }

    // TODO: Resolve components relative of their preset path
    const loadables = preset.map(entry => {
      if (presetConfig[entry.name] === false) {
        // $FlowIgnore: We are filtering it later, dumb flow
        return false
      }
      // $FlowIgnore: Types too complex for flow
      return [entry.component, Object.assign({}, entry.config, presetConfig[entry.name])]
    }).filter(i => i)
    const components = await Helpers.getLoadables(loadables, this.config.compilation.rootDirectory)
    const subscriptions = new CompositeDisposable()
    subscriptions.add(...components.map(([component, config]) => this.compilation.addComponent(component, config)))
    return subscriptions
  }
  async generate(givenFiles: ?Array<File> = null, runtimeConfig: Object = {}): Promise<Object> {
    const files = givenFiles || await this.processTree()
    return await this.compilation.generate(files, runtimeConfig)
  }
  // Spec:
  // - Normalize all givenRequests to an array
  // - Asyncly and con-currently process all trees
  // - Share files cache between tree resolutions to avoid duplicates
  async processTree(givenRequest: ?string = null, givenFrom: ?string = null, cached: boolean = true): Promise<Array<File>> {
    let requests
    const files: Map<string, File> = new Map()
    if (!givenRequest) {
      requests = this.config.compilation.entry
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
  watch(config: Object = {}): Promise<Disposable> {
    return this.compilation.watch(Object.assign({}, this.config.watcher, config))
  }
  dispose() {
    this.subscriptions.dispose()
  }
  // NOTE: Components are loaded before presets. This is important for order-sensitive components
  static async create(givenConfig: Object): Promise<Pundle> {
    invariant(typeof givenConfig === 'object' && givenConfig, 'Config must be an object')
    invariant(typeof givenConfig.rootDirectory === 'string', 'config.rootDirectory must be a string')

    const config = await Helpers.getPundleConfig(givenConfig.rootDirectory, givenConfig)
    const pundle = new Pundle(UNIQUE_SIGNATURE_OBJ, config)
    await pundle.loadComponents(config.components)
    for (const preset of config.presets) {
      if (Array.isArray(preset)) {
        await pundle.loadPreset(preset[0], preset[1])
      } else {
        await pundle.loadPreset(preset)
      }
    }
    return pundle
  }
}

module.exports = Pundle
