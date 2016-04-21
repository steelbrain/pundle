'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import Modules from './modules'
import Watcher from './watcher'
import Generator from './generator'
import type { Disposable } from 'sb-event-kit'
import type Pundle from '../index.js'
import type { ProcessorConfig, WatcherConfig, Config } from '../types'

let lock = 0

export default class Compilation {
  locks: Set<number>;
  pundle: Pundle;
  config: Config;
  emitter: Emitter;
  modules: Modules;
  watcher: Watcher;
  generator: Generator;
  subscriptions: CompositeDisposable;

  constructor(pundle: Pundle) {
    this.locks = new Set()
    this.pundle = pundle
    this.config = Object.assign({}, pundle.config)
    this.emitter = new Emitter()
    this.modules = new Modules(this)
    this.watcher = new Watcher(this)
    this.generator = new Generator(this)
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    this.subscriptions.add(this.modules)
    this.subscriptions.add(this.watcher)
    this.subscriptions.add(this.generator)
  }
  compile(): Promise {
    const id = ++lock
    this.locks.add(id)
    return Promise.all(this.config.entry.map(entry => this.read(entry))).then(() => {
      this.locks.delete(id)
    }, error => {
      this.locks.delete(id)
      throw error
    })
  }
  read(filePath: string): Promise {
    return this.modules.read(filePath)
  }
  push(filePath: string, contents: string): Promise {
    return this.modules.push(filePath, contents)
  }
  generate(options: ?ProcessorConfig): string {
    return this.generator.generate(options)
  }
  generateSourceMap(options: ?ProcessorConfig, asComment: boolean = false): string {
    return this.generator.generateSourceMap(options, asComment)
  }
  watch(options: WatcherConfig): { disposable: Disposable, queue: Promise } {
    return this.watcher.watch(options)
  }
  shouldGenerate(): boolean {
    return this.generator.shouldGenerate()
  }
  clearCache() {
    this.modules.registry.clear()
  }
  onDidDestroy(callback: Function): Disposable {
    return this.emitter.on('did-destroy', callback)
  }
  onBeforeCompile(callback: Function): Disposable {
    return this.modules.onBeforeCompile(callback)
  }
  onAfterCompile(callback: Function): Disposable {
    return this.modules.onAfterCompile(callback)
  }
  onDidCompile(callback: Function): Disposable {
    return this.modules.onDidCompile(callback)
  }
  dispose() {
    this.emitter.emit('did-destroy')
    this.subscriptions.dispose()
  }
}
