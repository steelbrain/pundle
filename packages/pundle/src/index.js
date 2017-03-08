/* @flow */

import Path from 'path'
import invariant from 'assert'
import ConfigFile from 'sb-config-file'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { File, FileChunk, GeneratorResult } from 'pundle-api/types'
import type { Disposable } from 'sb-event-kit'

import * as Helpers from './helpers'
import Context from './context'
import Compilation from './compilation'
import type { PundleConfig, Loadable } from '../types'

const UNIQUE_SIGNATURE_OBJ = {}

class Pundle {
  config: PundleConfig;
  emitter: Emitter;
  context: Context;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(signature: typeof UNIQUE_SIGNATURE_OBJ, config: PundleConfig) {
    if (signature !== UNIQUE_SIGNATURE_OBJ) {
      throw new Error('Direct constructor call not allowed. Use Pundle.create() instead')
    }

    this.config = config
    this.emitter = new Emitter()
    this.context = new Context(config)
    this.compilation = new Compilation(this.context)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.compilation)
  }
  async loadComponents(givenComponents: Array<Loadable>): Promise<CompositeDisposable> {
    if (!Array.isArray(givenComponents)) {
      throw new Error('Parameter 1 to loadComponents() must be an Array')
    }
    const components = await Helpers.getLoadables(givenComponents, this.config.rootDirectory)
    const subscriptions = new CompositeDisposable()
    subscriptions.add(...components.map(([component, config]) => this.context.addComponent(component, config)))
    return subscriptions
  }
  // Notes:
  // - False in a preset config for a component means ignore it
  // - Component config given takes presedence over preset component config
  async loadPreset(givenPreset: Object | string, presetConfig: Object = {}): Promise<CompositeDisposable> {
    let preset = givenPreset
    if (typeof preset === 'string') {
      preset = await Helpers.load(preset, this.config.rootDirectory)
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
        return false
      }
      return [entry.component, Object.assign({}, entry.config, presetConfig.common, presetConfig[entry.name])]
    }).filter(i => i)
    const components = await Helpers.getLoadables(loadables, this.config.rootDirectory)
    const subscriptions = new CompositeDisposable()
    subscriptions.add(...components.map(([component, config]) => this.context.addComponent(component, config)))
    return subscriptions
  }
  async getCache(): Promise<ConfigFile> {
    return ConfigFile.get(await Helpers.getCacheFilePath(this.config.rootDirectory), {
      files: [],
      directory: this.config.rootDirectory,
    }, {
      prettyPrint: false,
      createIfNonExistent: true,
    })
  }
  getCachedFiles(cache: ConfigFile, oldFiles: Map<string, File> = new Map()): Map<string, File> {
    return Helpers.unserializeFiles(cache.getSync('files'), oldFiles)
  }
  setCachedFiles(cache: ConfigFile, files: Map<string, File>): void {
    cache.setSync('files', Helpers.serializeFiles(files))
  }
  async generate(chunks: ?Array<FileChunk> = null, runtimeConfig: Object = {}): Promise<Array<GeneratorResult>> {
    return this.context.generate(chunks || await this.build(), runtimeConfig)
  }
  async build(useCache: boolean = true): Promise<Array<FileChunk>> {
    const oldFiles = new Map()
    if (useCache) {
      await this.getCachedFiles(await this.getCache(), oldFiles)
    }
    return this.compilation.build(useCache, oldFiles)
  }
  async watch(useCache: boolean = true): Promise<Disposable> {
    const oldFiles = new Map()
    if (useCache) {
      await this.getCachedFiles(await this.getCache(), oldFiles)
    }
    return this.compilation.watch(useCache, oldFiles)
  }
  fill(html: string, chunks: Array<FileChunk>, config: { publicRoot: string, bundlePath: string }): string {
    const primaryChunks = []
    const bundlePathExt = Path.extname(config.bundlePath)
    const bundlePathWithoutExt = config.bundlePath.slice(0, -1 * bundlePathExt.length)
    chunks.forEach(function(chunk) {
      if (chunk.entries.length || (!chunk.imports.length && chunk.files.size)) {
        primaryChunks.push(`  <script src="${Path.join(config.publicRoot || '/', `${bundlePathWithoutExt}.${chunk.label}.js`)}"></script>`)
      }
    })

    return html.replace('<!-- pundle scripts -->', primaryChunks.join('\n').trim())
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
