// @flow

import invariant from 'assert'
import { apiVersion } from '../package.json'
import { VALID_TYPES } from './common'
import type { ComponentAny } from './types'

export default class Components {
  registered: Array<ComponentAny>
  constructor() {
    this.registered = []
  }
  register(component: ComponentAny) {
    invariant(
      component && typeof component === 'object',
      `register() expects first parameter to be non-null object, given: ${typeof component}`,
    )

    const { name, version, type, callback, defaultOptions, apiVersion: componentApiVersion } = component
    invariant(typeof name === 'string', `register() expects component.name to be string, given: ${typeof name}`)
    invariant(typeof version === 'string', `register() expects component.version to be string, given: ${typeof version}`)
    invariant(VALID_TYPES.includes(type), `register() expects component.type to be valid type, given: ${String(type)}`)
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
