// @flow

import invariant from 'assert'
import { apiVersion } from '../package.json'
import * as T from './types'

const TYPES: Array<T.ComponentType> = ['resolver', 'reporter', 'loader']

export class Components {
  registered: Array<T.ComponentAny>
  constructor() {
    this.registered = []
  }
  register(component: T.ComponentAny) {
    invariant(
      component && typeof component === 'object',
      `register() expects first parameter to be non-null object, given: ${typeof component}`,
    )

    const { name, version, type, callback, defaultOptions, apiVersion: componentApiVersion } = component
    invariant(typeof name === 'string', `register() expects component.name to be string, given: ${typeof name}`)
    invariant(typeof version === 'string', `register() expects component.version to be string, given: ${typeof version}`)
    invariant(TYPES.includes(type), `register() expects component.type to be valid type, given: ${String(type)}`)
    invariant(typeof callback === 'function', 'register() expects component.callback to be function')
    invariant(
      defaultOptions && typeof defaultOptions === 'object',
      `register() expects component.defaultOptions to be non-null object, given: ${typeof defaultOptions}`,
    )
    invariant(
      componentApiVersion === apiVersion,
      `register() expects component.apiVersion to be ${apiVersion}, given: ${componentApiVersion}`,
    )
    component.apiVersion = componentApiVersion

    this.registered.push(component)
  }
}

export function registerComponent({
  name,
  type,
  version,
  callback,
  defaultOptions = {},
}: {
  name: string,
  type: T.ComponentType,
  version: string,
  callback: Function,
  defaultOptions: Object,
}): Component {
  invariant(typeof name === 'string', `registerComponent() expects options.name to be string, given: ${typeof name}`)
  invariant(
    typeof version === 'string',
    `registerComponent() expects options.version to be string, given: ${typeof version}`,
  )
  invariant(TYPES.includes(type), `registerComponent() expects options.type to be valid type name, given: ${String(type)}`)
  invariant(typeof callback === 'function', 'registerComponent() expects options.callback to be function')
  invariant(
    defaultOptions && typeof defaultOptions === 'object',
    `registerComponent() expects options.defaultOptions to be non-null object, given: ${typeof defaultOptions}`,
  )

  return {
    name,
    version,
    type,
    callback,
    defaultOptions,
    apiVersion,
  }
}
