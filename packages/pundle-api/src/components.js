// @flow

import invariant from 'assert'
import { apiVersion } from '../package.json'
import type { HookName, Component } from '../types'

const Hooks: Array<HookName> = ['resolve']

export class Components {
  registered: Array<Component>
  constructor() {
    this.registered = []
  }
  getByName(name: string): ?Component {
    invariant(
      typeof name === 'string',
      `getByName() expects first parameter to be string, given: ${typeof name}`,
    )

    return this.registered.find(c => c.name === name)
  }
  getByHookName(hookName: HookName): Array<Component> {
    invariant(
      Hooks.includes(hookName),
      `getByHookName() expects first parameter to be valid hook name, given: ${String(
        hookName,
      )}`,
    )

    return this.registered.filter(c => c.hookName === hookName)
  }
  register(component: Component) {
    invariant(
      component && typeof component === 'object',
      `register() expects first parameter to be object, given: ${typeof component}`,
    )

    const {
      name,
      version,
      hookName,
      callback,
      defaultOptions,
      apiVersion: componentApiVersion,
    } = component
    invariant(
      typeof name === 'string',
      `register() expects component.name to be string, given: ${typeof name}`,
    )
    invariant(
      typeof version === 'string',
      `register() expects component.version to be string, given: ${typeof version}`,
    )
    invariant(
      Hooks.includes(hookName),
      `register() expects component.hookName to be valid hook name, given: ${String(
        hookName,
      )}`,
    )
    invariant(
      typeof callback === 'function',
      'register() expects component.callback to be function',
    )
    invariant(
      defaultOptions && typeof defaultOptions === 'object',
      `register() expects component.defaultOptions to be object, given: ${typeof defaultOptions}`,
    )
    invariant(
      componentApiVersion === apiVersion,
      `register() expects component.apiVersion to be ${apiVersion}, given: ${componentApiVersion}`,
    )

    this.registered.push(component)
  }
  unregister(name: string) {
    invariant(
      typeof name === 'string',
      `unregister() expects first parameter to be string, given: ${typeof name}`,
    )

    const index = this.registered.findIndex(c => c.name === name)
    if (index !== -1) {
      this.registered.splice(index, 1)
    }
  }
}

export function registerComponent(
  name: string,
  version: string,
  hookName: HookName,
  callback: Function,
  defaultOptions: Object = {},
): Component {
  invariant(
    typeof name === 'string',
    `registerComponent() expects first parameter to be string, given: ${typeof name}`,
  )
  invariant(
    typeof version === 'string',
    `registerComponent() expects second parameter to be string, given: ${typeof version}`,
  )
  invariant(
    Hooks.includes(hookName),
    `registerComponent() expects third parameter to be valid hook name, given: ${String(
      hookName,
    )}`,
  )
  invariant(
    typeof callback === 'function',
    'registerComponent() expects forth parameter to be function',
  )
  invariant(
    defaultOptions && typeof defaultOptions === 'object',
    `registerComponent() expects fifth component to be object, given: ${typeof defaultOptions}`,
  )

  return {
    name,
    version,
    hookName,
    callback,
    defaultOptions,
    apiVersion,
  }
}
