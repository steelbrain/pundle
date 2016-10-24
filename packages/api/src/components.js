/* @flow */

import invariant from 'assert'
import { version } from './helpers'
import * as Types from '../types'

function create<T1, T2>(callback: T2, defaultConfig: Object, type: T1): Types.Component<T1, T2> {
  invariant(typeof callback === 'function', 'Parameter 1 must be a function')
  invariant(typeof defaultConfig === 'object' && defaultConfig, 'Parameter 2 must be an object')

  return {
    $type: type,
    $apiVersion: version,
    callback,
    defaultConfig,
  }
}

export function createLoader(callback: Types.LoaderCallback, defaultConfig: Object = {}): Types.Loader {
  return create(callback, defaultConfig, 'loader')
}

export function createPlugin(callback: Types.PluginCallback, defaultConfig: Object = {}): Types.Plugin {
  return create(callback, defaultConfig, 'plugin')
}

export function createResolver(callback: Types.ResolverCallback, defaultConfig: Object = {}): Types.Resolver {
  return create(callback, defaultConfig, 'resolver')
}

export function createReporter(callback: Types.ReporterCallback, defaultConfig: Object = {}): Types.Reporter {
  return create(callback, defaultConfig, 'reporter')
}

export function createGenerator(callback: Types.GeneratorCallback, defaultConfig: Object = {}): Types.Generator {
  return create(callback, defaultConfig, 'generator')
}

export function createTransformer(callback: Types.TransformerCallback, defaultConfig: Object = {}): Types.Transformer {
  return create(callback, defaultConfig, 'transformer')
}

export function createPostTransformer(callback: Types.PostTransformerCallback, defaultConfig: Object = {}): Types.PostTransformer {
  return create(callback, defaultConfig, 'post-transformer')
}
