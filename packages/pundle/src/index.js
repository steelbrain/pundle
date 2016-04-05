'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { getPlugins, normalizeConfig } from './helpers'
import Path from './path'
import FileSystem from './file-system'
import Compilation from './compilation'
import type { Pundle$Config, Pundle$Plugin, Pundle$Watcher$Options$User } from './types'
import type { Disposable } from 'sb-event-kit'

class Pundle {
  path: Path;
  config: Pundle$Config;
  emitter: Emitter;
  fileSystem: FileSystem;
  subscriptions: CompositeDisposable;

  constructor(config: Pundle$Config) {
    this.config = normalizeConfig(config)

    this.fileSystem = new FileSystem(this.config, new this.config.FileSystem(this.config))
    this.path = new Path(this.config, this.fileSystem)
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.path)
  }
  async loadPlugins(givenPlugins: Array<Pundle$Plugin>): Promise {
    const plugins = await getPlugins(givenPlugins, this.path, this.config.rootDirectory)
    for (const { plugin, parameters } of plugins) {
      plugin(this, parameters)
    }
  }
  get(): Compilation {
    const compilation = new Compilation(this)
    this.emitter.emit('observe-compilations', compilation)
    return compilation
  }
  async compile(generateSourceMap: boolean = false): Promise<{ contents: string, sourceMap: ?Object }> {
    const compilation = this.get()
    await compilation.compile()
    const contents = compilation.generate()
    const sourceMap = generateSourceMap ? compilation.generateSourceMap() : null
    return {
      contents,
      sourceMap
    }
  }
  watch(options: Pundle$Watcher$Options$User): Disposable {
    return this.get().watch(options)
  }
  observeCompilations(callback: Function): Disposable {
    return this.emitter.on('observe-compilations', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
