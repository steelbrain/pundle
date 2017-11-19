// @flow

import invariant from 'assert'
import { apiVersion } from '../package.json'
import { VALID_TYPES } from './common'
import type {
  ComponentAny,
  ComponentReporter,
  ComponentResolver,
  ComponentLoader,
  ComponentTransformer,
  ComponentPlugin,
  ComponentGenerator,
  ComponentPostGenerator,
  ComponentFilePostGenerator,
  ComponentJobTransformer,
} from './types'

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
    invariant(VALID_TYPES.has(type), `register() expects component.type to be valid type, given: ${String(type)}`)
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
  // NOTE: Using forEach and push because flow hates arr.filter
  getReporters(): Array<ComponentReporter> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'reporter') filtered.push(entry)
    })
    return filtered
  }
  getResolvers(): Array<ComponentResolver> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'resolver') filtered.push(entry)
    })
    return filtered
  }
  getLoaders(): Array<ComponentLoader> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'loader') filtered.push(entry)
    })
    return filtered
  }
  getTransformers(): Array<ComponentTransformer> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'transformer') filtered.push(entry)
    })
    return filtered
  }
  getPlugins(): Array<ComponentPlugin> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'plugin') filtered.push(entry)
    })
    return filtered
  }
  getGenerators(): Array<ComponentGenerator> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'generator') filtered.push(entry)
    })
    return filtered
  }
  getPostGenerators(): Array<ComponentPostGenerator> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'post-generator') filtered.push(entry)
    })
    return filtered
  }
  getFilePostGenerators(): Array<ComponentFilePostGenerator> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'file-post-generator') filtered.push(entry)
    })
    return filtered
  }
  getJobTransformers(): Array<ComponentJobTransformer> {
    const filtered = []
    this.registered.forEach(entry => {
      if (entry.type === 'job-transformer') filtered.push(entry)
    })
    return filtered
  }
}
