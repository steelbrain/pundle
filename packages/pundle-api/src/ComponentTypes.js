// @flow

import invariant from 'assert'
import { apiVersion } from '../package.json'
import type {
  Component,
  ComponentType,
  ComponentReporter,
  ComponentReporterCallback,
  ComponentResolver,
  ComponentResolverCallback,
  ComponentLoader,
  ComponentLoaderCallback,
  ComponentTransformer,
  ComponentTransformerCallback,
  ComponentPlugin,
  ComponentPluginCallback,
  ComponentGenerator,
  ComponentGeneratorCallback,
  ComponentPostGenerator,
  ComponentPostGeneratorCallback,
  ComponentFilePostGenerator,
  ComponentFilePostGeneratorCallback,
} from './types'

type CreationParameters<TCALLBACK> = {|
  name: string,
  version: string,
  callback: TCALLBACK,
  defaultOptions: Object,
|}

function createComponent<TTYPE: ComponentType, TCALLBACK>(
  type: TTYPE,
  { name, version, callback, defaultOptions = {} }: CreationParameters<TCALLBACK>,
): Component<TTYPE, TCALLBACK> {
  invariant(typeof name === 'string', `registerComponent() expects options.name to be string, given: ${typeof name}`)
  invariant(
    typeof version === 'string',
    `registerComponent() expects options.version to be string, given: ${typeof version}`,
  )
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

export function createReporter(params: CreationParameters<ComponentReporterCallback>): ComponentReporter {
  return createComponent('reporter', params)
}
export function createResolver(params: CreationParameters<ComponentResolverCallback>): ComponentResolver {
  return createComponent('resolver', params)
}
export function createLoader(params: CreationParameters<ComponentLoaderCallback>): ComponentLoader {
  return createComponent('loader', params)
}
export function createTransformer(params: CreationParameters<ComponentTransformerCallback>): ComponentTransformer {
  return createComponent('transformer', params)
}
export function createPlugin(params: CreationParameters<ComponentPluginCallback>): ComponentPlugin {
  return createComponent('plugin', params)
}
export function createGenerator(params: CreationParameters<ComponentGeneratorCallback>): ComponentGenerator {
  return createComponent('generator', params)
}
export function createPostGenerator(params: CreationParameters<ComponentPostGeneratorCallback>): ComponentPostGenerator {
  return createComponent('post-generator', params)
}
export function createFilePostGenerator(
  params: CreationParameters<ComponentFilePostGeneratorCallback>,
): ComponentFilePostGenerator {
  return createComponent('file-post-generator', params)
}
