/* @flow */

import invariant from 'assert'
import { version, makePromisedLock } from './helpers'
import type {
  Component,
  CallbackOrConfig,
  ComponentCallbacks,

  Simple,
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

function create<T1, T2>(config: CallbackOrConfig<T2>, defaultConfig: Object, type: T1): Component<T1, T2> {
  let callback
  let activate = function() { /* No Op */ }
  let dispose = function() { /* No Op */ }
  if (typeof config === 'function') {
    invariant(typeof config === 'function', 'Parameter 1 must be a function')
    callback = config
  } else if (typeof config === 'object' && config) {
    if (config.activate) {
      invariant(typeof config.activate === 'function', 'config.activate must be a function')
      activate = config.activate
    }
    if (config.dispose) {
      invariant(typeof config.dispose === 'function', 'config.dispose must be a function')
      dispose = config.dispose
    }
    // NOTE: Simple components have no callbacks
    if (type !== 'simple') {
      invariant(config.callback === 'function', 'config.callback must be a function')
    }
    callback = config.callback
  } else {
    throw new Error('Parameter 1 must be a function or config object')
  }
  invariant(typeof defaultConfig === 'object' && defaultConfig, 'Parameter 2 must be an object')

  return {
    $type: type,
    $apiVersion: version,
    activate,
    callback,
    dispose,
    defaultConfig,
  }
}

export function createSimple(options: ComponentCallbacks): Simple {
  return create({ activate: options.activate, callback() {}, dispose: options.dispose }, {}, 'simple')
}

export function createLoader(options: CallbackOrConfig<LoaderCallback>, defaultConfig: Object = {}): Loader {
  return create(options, defaultConfig, 'loader')
}

export function createPlugin(options: CallbackOrConfig<PluginCallback>, defaultConfig: Object = {}): Plugin {
  return create(options, defaultConfig, 'plugin')
}

// NOTE:
// The reason why we have the option allowRecursive is to allow external resolvers to keep their logic simple
// For example, default resolver would allow recusion and npm-installer wouldn't. NPM installer would try to
// resolve different types of requests when determining wether it should or should not install the requested
// dependency (while not processing them itself), such requests are to the default module resolver.
// Doing this in the npm installer requires rewriting and wrapping it all in a try/finally block and making it
// unnecessarily complex. Keeping the logic here allows reuse.
export function createResolver(givenOptions: CallbackOrConfig<ResolverCallback>, defaultConfig: Object = {}, allowRecursive: boolean = true): Resolver {
  let options = givenOptions
  if (!allowRecursive) {
    if (typeof options === 'function') {
      options = makePromisedLock(options, (_, request, fromFile) => `${request}$${fromFile}`)
    } else if (typeof options === 'object' && options) {
      options.callback = makePromisedLock(options.callback, (_, request, fromFile) => `${request}$${fromFile}`)
    }
  }
  return create(options, defaultConfig, 'resolver')
}

export function createReporter(options: CallbackOrConfig<ReporterCallback>, defaultConfig: Object = {}): Reporter {
  return create(options, defaultConfig, 'reporter')
}

export function createGenerator(options: CallbackOrConfig<GeneratorCallback>, defaultConfig: Object = {}): Generator {
  return create(options, defaultConfig, 'generator')
}

export function createTransformer(options: CallbackOrConfig<TransformerCallback>, defaultConfig: Object = {}): Transformer {
  return create(options, defaultConfig, 'transformer')
}

export function createPostTransformer(options: CallbackOrConfig<PostTransformerCallback>, defaultConfig: Object = {}): PostTransformer {
  return create(options, defaultConfig, 'post-transformer')
}
