/* @flow */

import Path from 'path'
import invariant from 'assert'
import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import Watcher from 'chokidar'
import arrayDifference from 'lodash.difference'
import * as Helpers from './helpers'
import applyLoaders from './loaders'
import Files from './files'
import Resolver from './resolver'
import PundlePath from './path'
import FileSystem from './filesystem'
import type { Config, State } from './types'

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
    applyLoaders(this)
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

    const event: { filePath: string, contents: string, sourceMap: any } = { filePath, contents, sourceMap: null }
    this.emitter.emit('before-process', event)
    let result = loader(this, filePath, contents, event.sourceMap)
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
  }
  async compile(): Promise<void> {
    await Promise.all(this.config.entry.map(entry => this.read(entry)))
  }
  watch(givenConfig: Object): Object {
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

    watcher.on('add', filePath => {
      toReturn.queue = toReturn.queue.then(() =>
        !this.files.has(filePath) && this.read(filePath)
      ).catch(config.error)
    })
    watcher.on('change', filePath => {
      toReturn.queue = toReturn.queue.then(() => {
        const retValue = this.read(filePath)
        if (ready) {
          return retValue.then(config.generate)
        }
        return retValue
      }).catch(config.error)
    })
    watcher.on('unlink', filePath => {
      toReturn.queue = toReturn.queue.then(() => {
        this.files.delete(filePath)
        return ready && config.generate()
      }).catch(config.error)
    })
    this.config.entry.forEach(filePath => {
      watcher.add(this.path.out(filePath))
    })
    this.files.forEach((_, filePath) => {
      watcher.add(this.path.out(filePath))
    })
    this.files.onDidAdd(filePath => {
      watcher.add(this.path.out(filePath))
    })
    this.files.onDidDelete(filePath => {
      watcher.unwatch(this.path.out(filePath))
    })
    this.subscriptions.add(toReturn.subscription)
    watcher.on('ready', () => {
      toReturn.queue = toReturn.queue.then(config.ready).catch(config.error)
      toReturn.queue = toReturn.queue.then(() => {
        ready = true
        return Helpers.isEverythingIn(this) && config.generate()
      }).catch(config.error)
    })
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
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
