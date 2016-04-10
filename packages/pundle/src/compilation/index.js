'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import Modules from './modules'
import Watcher from './watcher'
import Generator from './generator'
import type { Disposable } from 'sb-event-kit'
import type Pundle from '../index.js'
import type { ProcessorConfig, WatcherConfig } from '../types'


export default class Compilation {
  pundle: Pundle;
  emitter: Emitter;
  modules: Modules;
  watcher: Watcher;
  generator: Generator;
  subscriptions: CompositeDisposable;

  constructor(pundle: Pundle) {
    this.pundle = pundle
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
    return Promise.all(this.pundle.config.entry.map(entry => this.modules.read(entry)))
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
