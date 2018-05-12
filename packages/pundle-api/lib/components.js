// @flow

import manifest from '../package.json'
import { COMPONENT_TYPES } from './constants'
import type {
  Component,
  ComponentType,
  ComponentIssueReporterCallback,
  ComponentIssueReporter,
  ComponentFileResolverCallback,
  ComponentFileResolver,
  ComponentFileLoaderCallback,
  ComponentFileLoader,
  ComponentFileTransformerCallback,
  ComponentFileTransformer,
} from './types'

const apiVersion = parseInt(manifest.version.split('.').shift(), 10)

type Payload<T> = {|
  name: string,
  version: string,
  priority?: number,
  callback: T,
|}
function createComponent<T1: ComponentType, T2>(
  type: T1,
  { name, version, priority = 100, callback }: Payload<T2>,
): Component<T1, T2> {
  return {
    name,
    version,
    type,
    priority,
    callback,
    apiVersion,
  }
}
export function validateComponent(component: any): Array<string> {
  const faults = []

  if (!component || typeof component !== 'object') {
    return ['component must be a valid object']
  }
  const componentName = `component${component.name && typeof component.name === 'string' ? `(${component.name})` : ''}`
  if (typeof component.apiVersion !== 'number') {
    return [`${componentName}.apiVersion must be a valid number`]
  }
  if (component.apiVersion !== apiVersion) {
    return [`${component}.apiVersion must be ${apiVersion} but got ${component.apiVersion}`]
  }

  if (!component.name || typeof component.name !== 'string') {
    faults.push(`${componentName}.name must be a valid string`)
  }
  if (!component.version || typeof component.version !== 'string') {
    faults.push(`${componentName}.version must be a valid string`)
  }
  if (!component.type || typeof component.type !== 'string') {
    faults.push(`${componentName}.type must be a valid string`)
  } else if (!COMPONENT_TYPES.includes(component.type)) {
    faults.push(`${componentName}.type must have a valid Component Type`)
  }
  if (typeof component.priority !== 'number') {
    faults.push(`${componentName}.priority must be a valid number`)
  }
  if (!component.callback || typeof component.callback !== 'function') {
    faults.push(`${componentName}.callback must be a valid function`)
  }

  return faults
}

export function createIssueReporter(payload: Payload<ComponentIssueReporterCallback>): ComponentIssueReporter {
  return createComponent('issue-reporter', payload)
}

export function createFileResolver(payload: Payload<ComponentFileResolverCallback>): ComponentFileResolver {
  return createComponent('file-resolver', payload)
}

export function createFileLoader(payload: Payload<ComponentFileLoaderCallback>): ComponentFileLoader {
  return createComponent('file-loader', payload)
}

export function createFileTransformer(payload: Payload<ComponentFileTransformerCallback>): ComponentFileTransformer {
  return createComponent('file-transformer', payload)
}
