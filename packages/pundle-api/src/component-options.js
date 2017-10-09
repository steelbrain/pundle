// @flow

import invariant from 'assert'
import type { Component, ComponentOptionsEntry } from '../types'

export default class ComponentOptions {
  registered: Array<ComponentOptionsEntry>
  constructor() {
    this.registered = []
  }
  register(name: string, options: Object): void {
    invariant(
      typeof name === 'string',
      `register() expects first parameter to be string, given: ${typeof name}`,
    )
    invariant(
      options && typeof options === 'object',
      `register() expects second parameter to be non-null object, given: ${typeof options}`,
    )
    this.registered.push({ name, options })
  }
  get(component: Component, overrideConfigs: Array<Object> = []): Object {
    invariant(
      component && typeof component === 'object',
      `get() expects first parameter to be Component, given: ${typeof component}`,
    )
    invariant(
      Array.isArray(overrideConfigs),
      `get() expects second parameter to be Array, given: ${typeof overrideConfigs}`,
    )

    return [component.defaultOptions]
      .concat(
        this.registered
          .filter(c => c.name === component.name)
          .map(c => c.options),
      )
      .concat(overrideConfigs)
      .reduce(
        (prevConfig, newConfig) => ({
          ...prevConfig,
          ...newConfig,
        }),
        {},
      )
  }
}
