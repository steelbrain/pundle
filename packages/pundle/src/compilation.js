/* @flow */

import { Emitter } from 'pundle-api'
import { CompositeDisopsable, Disposable } from 'sb-event-kit'
import type { Config, Component } from './types'

export default class Compilation {
  config: Config;
  emitter: Emitter;
  callbacks: Set<Function>;
  subscriptions: CompositeDisopsable;

  constructor(config: Config) {
    this.config = config
    this.emitter = new Emitter()
    this.callbacks = new Set()
    this.subscriptions = new CompositeDisopsable()

    this.subscriptions.add(this.emitter)
  }
  addComponent(component: Component<string, Function>, config: Object): void {
    const callback = (...parameters: Array<any>) =>
      component.callback.apply(this, [Object.assign({}, component.defaultConfig, config)].concat(parameters))
    callback.config = config
    callback.component = component

    this.callbacks.add(callback)
    this.emitter.on(component.$type, callback)
    return new Disposable(() => {
      this.callbacks.delete(callback)
      this.emitter.off(component.$type, callback)
    })
  }
  deleteComponent(component: Component<string, Function>, config: Object): void {
    for (const callback of this.callbacks) {
      // $FlowIgnore: These are our magical properties
      if (callback.config === config && callback.component === component) {
        this.emitter.off(component.$type, callback)
        this.callbacks.delete(callback)
        break
      }
    }
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
