/* @flow */

import invariant from 'assert'
import { version, makePromisedLock } from './helpers'
import type {
  Component,
  CallbackOrConfig,

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
  ChunkTransformer,
  ChunkTransformerCallback,
  Watcher,
  WatcherCallbacks,
} from '../types'

const noOp: any = function() { /* No Op */ }

function create<T1, T2>(config: CallbackOrConfig<T2>, defaultConfig: Object, type: T1): Component<T1, T2> {
  let callback
  let activate = noOp
  let dispose = noOp
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
    invariant(config.callback === 'function', 'config.callback must be a function')
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
      options = makePromisedLock(options, (_, __, request, fromFile) => `${request}$${fromFile}`)
    } else if (typeof options === 'object' && options) {
      options.callback = makePromisedLock(options.callback, (_, __, request, fromFile) => `${request}$${fromFile}`)
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

export function createChunkTransformer(options: CallbackOrConfig<ChunkTransformerCallback>, defaultConfig: Object = {}): ChunkTransformer {
  return create(options, defaultConfig, 'chunk-transformer')
}

export function createWatcher(callbacks: WatcherCallbacks, defaultConfig: Object = {}): Watcher {
  let anyCallbackGiven = false
  let activate = noOp
  let tick = noOp
  let ready = noOp
  let compile = noOp
  let dispose = noOp

  invariant(typeof callbacks === 'object' && callbacks, 'Parameter 1 to createWatcher() must be an object')

  if (callbacks.activate) {
    anyCallbackGiven = true
    invariant(typeof callbacks.activate === 'function', 'callbacks.activate() must be a function')
    activate = callbacks.activate
  }
  if (callbacks.tick) {
    anyCallbackGiven = true
    invariant(typeof callbacks.tick === 'function', 'callbacks.tick() must be a function')
    tick = callbacks.tick
  }
  if (callbacks.ready) {
    anyCallbackGiven = true
    invariant(typeof callbacks.ready === 'function', 'callbacks.ready() must be a function')
    ready = callbacks.ready
  }
  if (callbacks.compile) {
    anyCallbackGiven = true
    invariant(typeof callbacks.compile === 'function', 'callbacks.compile() must be a function')
    compile = callbacks.compile
  }
  if (callbacks.dispose) {
    anyCallbackGiven = true
    invariant(typeof callbacks.dispose === 'function', 'callbacks.dispose() must be a function')
    dispose = callbacks.dispose
  }

  if (!anyCallbackGiven) {
    throw new Error('createWatcher() expects at least one valid callback')
  }

  return {
    $type: 'watcher',
    $apiVersion: version,
    activate,
    tick,
    ready,
    compile,
    dispose,
    defaultConfig,
  }
}
