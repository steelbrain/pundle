/* @flow */

import invariant from 'assert'
import sourceMap from 'source-map'
import type { File, ComponentAny } from 'pundle-api/types'
import type Compilation from './'
import type { ComponentEntry } from './types'
import type { WatcherConfig } from '../types'

export function *filterComponents(components: Set<ComponentEntry>, type: string): Generator<ComponentEntry, void, void> {
  for (const entry of components) {
    if (entry.component.$type === type) {
      yield entry
    }
  }
}

export function invokeComponent(compilation: Compilation, component: { component: ComponentAny, config: Object }, ...parameters: Array<any>): Promise<any> {
  return component.component.callback.apply(compilation, [
    // $FlowIgnore: Flow gets confused with so many types
    Object.assign({}, component.component.defaultConfig, component.config),
  ].concat(parameters))
}

// Shamelessly copied from babel/babel under MIT License
export function mergeSourceMap(inputMap: Object, map: Object): Object {
  const inputMapConsumer = new sourceMap.SourceMapConsumer(inputMap)
  const outputMapConsumer = new sourceMap.SourceMapConsumer(map)

  const mergedGenerator = new sourceMap.SourceMapGenerator({
    file: inputMapConsumer.file,
    sourceRoot: inputMapConsumer.sourceRoot,
    skipValidation: true,
  })

  // This assumes the output map always has a single source, since Babel always compiles a single source file to a
  // single output file.
  const source = outputMapConsumer.sources[0]

  inputMapConsumer.eachMapping(function(mapping) {
    const generatedPosition = outputMapConsumer.generatedPositionFor({
      line: mapping.generatedLine,
      column: mapping.generatedColumn,
      source,
    })
    if (typeof generatedPosition.column !== 'undefined') {
      mergedGenerator.addMapping({
        source: mapping.source,

        original: !mapping.source ? null : {
          line: mapping.originalLine,
          column: mapping.originalColumn,
        },

        generated: generatedPosition,
      })
    }
  })

  const mergedMap = mergedGenerator.toJSON()
  inputMap.mappings = mergedMap.mappings
  return inputMap
}

// Notes:
// - If we have sourceMap of previous steps but not of latest one, nuke previous sourceMap, it's invalid now
export function mergeResult(file: File, result: ?{ contents: string, sourceMap: ?Object }): void {
  if (!result) {
    return
  }
  if (file.sourceMap && !result.sourceMap) {
    file.sourceMap = null
  } else if (file.sourceMap && result.sourceMap) {
    file.sourceMap = mergeSourceMap(file.sourceMap, result.sourceMap)
  } else if (!file.sourceMap && result.sourceMap) {
    file.sourceMap = result.sourceMap
  }
  file.contents = result.contents
}

// Notes:
// - If usePolling on config object doesn't exist, check env for existance
export function fillWatcherConfig(config: Object): WatcherConfig {
  const toReturn = {}

  invariant(typeof config === 'object' && config, 'Watcher config must be an object')
  if ({}.hasOwnProperty.call(config, 'usePolling')) {
    toReturn.usePolling = !!config.usePolling
  } else {
    toReturn.usePolling = {}.hasOwnProperty.call(process.env, 'PUNDLE_WATCHER_USE_POLLING')
  }
  if (config.tick) {
    invariant(typeof config.tick === 'function', 'config.tick must be a function')
    toReturn.tick = config.tick
  } else toReturn.tick = function() { }
  if (config.update) {
    invariant(typeof config.update === 'function', 'config.update must be a function')
    toReturn.update = config.update
  } else toReturn.update = function() { }
  if (config.ready) {
    invariant(typeof config.ready === 'function', 'config.ready must be a function')
    toReturn.ready = config.ready
  } else toReturn.ready = function() { }
  invariant(typeof config.compile === 'function', 'config.compile must be a function')
  toReturn.compile = config.compile

  return toReturn
}
