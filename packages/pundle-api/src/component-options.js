// @flow

import invariant from 'assert'
import type { Component, ComponentOptionsEntry } from '../types'

export class ComponentOptions {
  registered: Array<ComponentOptionsEntry>
  constructor() {
    this.registered = []
  }
  register(options: ComponentOptionsEntry): void {
    invariant(
      options && typeof options === 'object',
      `register() expects first parameter to be non-null object, given: ${typeof options}`,
    )

    const { name, config } = options
    invariant(
      typeof name === 'string',
      `register() expects options.name to be string, given: ${typeof name}`,
    )
    invariant(
      config && typeof config === 'object',
      `register() expects options.config to be non-null object, given: ${typeof config}`,
    )
    this.registered.push({ name, config })
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
          .map(c => c.config),
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

export function getComponentOptions(name: string, config: Object) {
  invariant(
    typeof name === 'string',
    `getComponentConfig() expects first parameter to be string, given: ${typeof name}`,
  )
  invariant(
    config && typeof config === 'object',
    `getComponentConfig() expects second parameter to be non-null object, given: ${typeof config}`,
  )

  return {
    name,
    config,
  }
}
