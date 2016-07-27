/* @flow */

import Path from 'path'
import debug from 'debug'
import Watcher from 'chokidar'
import invariant from 'assert'
import arrayDifference from 'lodash.difference'
import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import * as Helpers from './helpers'
import * as Loaders from './loaders'
import Files from './files'
import Resolver from './resolver'
import PundlePath from './path'
import FileSystem from './filesystem'
import type { Config, State, Loader } from './types'

const debugWatcher = debug('Pundle:Watcher')

@Files.attach
@Resolver.attach
@PundlePath.attach
@FileSystem.attach
class Pundle {
  fs: FileSystem;
  path: PundlePath;
  state: State;
  files: Files;
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
    this.state.loaders.set('.json', Loaders.json)
    this.state.loaders.set('.js', Loaders.javascript)
  }
  loadLoaders(entries: Array<{ extensions: Array<string>, loader: Loader }>): Array<string> {
    const overwroteLoaders = []
    for (const entry of entries) {
      const loader = entry.loader
      for (const extension of entry.extensions) {
        if (this.state.loaders.has(extension)) {
          overwroteLoaders.push(extension)
        }
        this.state.loaders.set(extension, loader)
      }
    }
    return overwroteLoaders
  }
  async loadPlugins(givenPlugins: Array<Plugin>): Promise<void> {
    const plugins = await Helpers.getPlugins(this, givenPlugins)
    for (const { plugin, parameters } of plugins) {
      plugin(this, parameters)
    }
  }
  async read(givenFilePath: string): Promise<void> {
    const filePath = this.path.in(givenFilePath)
    const oldFile = this.files.get(filePath)
    const contents = await this.fs.read(filePath)
    if (oldFile && oldFile.source === contents) {
      return
    }
    const extension = Path.extname(filePath)
    const loader = this.state.loaders.get(extension)
    invariant(loader, `Unrecognized extension '${extension}' for '${givenFilePath}'`)

    const event: { filePath: string, contents: string, sourceMap: any, oldFile: ?Object } = { filePath, contents, sourceMap: null, oldFile }
    this.emitter.emit('before-process', event)
    let result = loader(this, filePath, event.contents, event.sourceMap)
    if (result instanceof Promise) {
      result = await result
    }
    event.contents = result.contents
    event.sourceMap = result.sourceMap
    this.emitter.emit('after-process', event)
    this.files.set(filePath, {
      source: contents,
      imports: result.imports,
      filePath,
      contents: event.contents,
      sourceMap: event.sourceMap,
    })

    try {
      await Array.from(result.imports).reduce((promise, entry) =>
        promise.then(() => !this.files.has(entry) && this.read(entry))
      , Promise.resolve())
    } catch (error) {
      if (oldFile) {
        this.files.set(filePath, oldFile)
      } else {
        this.files.delete(filePath)
      }
      throw error
    }
    if (oldFile) {
      const removedImports = arrayDifference(Array.from(oldFile.imports), Array.from(result.imports))
      for (const entry of (removedImports: Array<string>)) {
        if (this.files.getOccurancesOf(entry) === 1) {
          this.files.delete(entry)
        }
      }
    }
    this.emitter.emit('did-process', event)
  }
  async compile(): Promise<void> {
    await Promise.all(this.config.entry.map(entry => this.read(entry)))
  }
  generate(givenConfig: Object = {}): Object {
    const config = Helpers.fillGeneratorConfig(givenConfig, this)
    // $FlowIgnore: I know what I'm doing
    config.contents = config.contents.map(i => this.files.get(i))
    const result = config.generate(this, config)
    if (!result || typeof result !== 'object') {
      throw new Error('Pundle generator returned invalid results')
    }
    return result
  }
  watch(givenConfig: Object): { queue: Promise<void>, subscription: Disposable } {
    let ready = false
    const config = Helpers.fillWatcherConfig(givenConfig)
    const watcher = Watcher.watch([], {
      usePolling: config.usePolling,
      followSymlinks: true,
    })
    const toReturn = {
      queue: Promise.resolve(),
      subscription: new Disposable(() => {
        this.subscriptions.remove(toReturn.subscription)
        watcher.close()
      }),
    }
    const addToWatcher = (filePath: string) => {
      toReturn.queue = toReturn.queue.then(() =>
        !this.files.has(filePath) && this.read(filePath)
      ).catch(config.error)
      watcher.add(filePath)
    }

    watcher.on('change', filePath => {
      debugWatcher(`File Changed :: ${filePath}`)
      toReturn.queue = toReturn.queue.then(() => {
        const retValue = this.read(filePath)
        if (ready) {
          return retValue.then(config.generate)
        }
        return retValue
      }).catch(config.error)
    })
    watcher.on('unlink', filePath => {
      debugWatcher(`File Removed :: ${filePath}`)
      toReturn.queue = toReturn.queue.then(() => {
        this.files.delete(filePath)
        return ready && config.generate()
      }).catch(config.error)
    })
    this.config.entry.forEach(filePath => {
      toReturn.queue = toReturn.queue.then(() => this.read(filePath)).catch(config.error)
      addToWatcher(this.path.out(filePath))
    })
    this.files.forEach((_, filePath) => {
      addToWatcher(this.path.out(filePath))
    })
    this.files.onDidAdd(filePath => {
      addToWatcher(this.path.out(filePath))
    })
    this.files.onDidDelete(filePath => {
      watcher.unwatch(this.path.out(filePath))
    })
    this.subscriptions.add(toReturn.subscription)
    toReturn.queue = toReturn.queue.then(config.ready).catch(config.error)
    toReturn.queue = toReturn.queue.then(() => {
      ready = true
      return Helpers.isEverythingIn(this) && config.generate()
    }).catch(config.error)
    return toReturn
  }
  /**
    A helper function get a unique ID of any given file Path
    Useful when config.pathType is number. Should be used across all plugins to generate the same unique IDs for files
  */
  getUniquePathID(path: string): string {
    const internalPath = this.path.in(path)
    if (this.config.pathType === 'number') {
      return Helpers.getPathID(this.path.in(path)).toString() + Path.extname(path)
    }
    return internalPath
  }
  onBeforeProcess(callback: Function): Disposable {
    return this.emitter.on('before-process', callback)
  }
  onAfterProcess(callback: Function): Disposable {
    return this.emitter.on('after-process', callback)
  }
  onDidProcess(callback: Function): Disposable {
    return this.emitter.on('did-process', callback)
  }
  clearCache() {
    this.files.forEach((_, file) => this.files.delete(file))
    this.fs.cache.clear()
    this.resolver.cache.clear()
    this.resolver.manifestCache.clear()
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
