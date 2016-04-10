'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import Modules from './modules'
import Watcher from './watcher'
import Generator from './generator'
import type { Disposable } from 'sb-event-kit'
import type Pundle from '../index.js'


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
  onDidDestroy(callback: Function): Disposable {
    return this.emitter.on('did-destroy', callback)
  }
  dispose() {
    this.emitter.emit('did-destroy')
    this.subscriptions.dispose()
  }
}
