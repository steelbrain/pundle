/* @flow */

import invariant from 'assert'
import { version, makePromisedLock } from './helpers'
import type {
  Component,

  Loader,
  LoaderCallback,
  Plugin,
  PluginCallback,
  Resolver,
  ResolverCallback,
  Reporter,
  ReporterCallback,
  Generator,
  GeneratorCallback,
  Transformer,
  TransformerCallback,
  PostTransformer,
  PostTransformerCallback,
} from '../types'

function create<T1, T2>(callback: T2, defaultConfig: Object, type: T1): Component<T1, T2> {
  invariant(typeof callback === 'function', 'Parameter 1 must be a function')
  invariant(typeof defaultConfig === 'object' && defaultConfig, 'Parameter 2 must be an object')

  return {
    $type: type,
    $apiVersion: version,
    callback,
    defaultConfig,
  }
}

export function createLoader(callback: LoaderCallback, defaultConfig: Object = {}): Loader {
  return create(callback, defaultConfig, 'loader')
}

export function createPlugin(callback: PluginCallback, defaultConfig: Object = {}): Plugin {
  return create(callback, defaultConfig, 'plugin')
}

// NOTE:
// The reason why we have the option allowRecursive is to allow external resolvers to keep their logic simple
// For example, default resolver would allow recusion and npm-installer wouldn't. NPM installer would try to
// resolve different types of requests when determining wether it should or should not install the requested
// dependency (while not processing them itself), such requests are to the default module resolver.
// Doing this in the npm installer requires rewriting and wrapping it all in a try/finally block and making it
// unnecessarily complex. Keeping the logic here allows reuse.
export function createResolver(givenCallback: ResolverCallback, defaultConfig: Object = {}, allowRecursive: boolean = true): Resolver {
  let callback = givenCallback
  if (!allowRecursive) {
    callback = makePromisedLock(callback)
  }
  return create(callback, defaultConfig, 'resolver')
}

export function createReporter(callback: ReporterCallback, defaultConfig: Object = {}): Reporter {
  return create(callback, defaultConfig, 'reporter')
}

export function createGenerator(callback: GeneratorCallback, defaultConfig: Object = {}): Generator {
  return create(callback, defaultConfig, 'generator')
}

export function createTransformer(callback: TransformerCallback, defaultConfig: Object = {}): Transformer {
  return create(callback, defaultConfig, 'transformer')
}

export function createPostTransformer(callback: PostTransformerCallback, defaultConfig: Object = {}): PostTransformer {
  return create(callback, defaultConfig, 'post-transformer')
}
