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
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    const resolved = await this.emitter.emitSome('resolver', request, from, cached)
    if (!resolved) {
      const error = new Error(`Cannot find module '${request}'${from ? ` from '${from}'` : ''}`)
      // $FlowIgnore: This is a custom property
      error.code = 'MODULE_NOT_FOUND'
      throw error
    }
    return resolved
  }
  addComponent(component: Component, config: Object): void {
    const callback = (...parameters: Array<any>) =>
      component.callback.apply(this, [
        // $FlowIgnore: Flow doesn't like Object.assign with unions
        Object.assign({}, component.defaultConfig, config),
      ].concat(parameters))
    callback.config = config
    callback.component = component

    this.callbacks.add(callback)
    this.emitter.on(component.$type, callback)
    return new Disposable(() => {
      this.callbacks.delete(callback)
      this.emitter.off(component.$type, callback)
    })
  }
  deleteComponent(component: Component, config: Object): void {
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
