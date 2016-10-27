/* @flow */

import sourceMap from 'source-map'
import type { File, ComponentAny } from 'pundle-api/types'
import type Compilation from './'
import type { ComponentEntry } from './types'

export function *filterComponents(components: Set<ComponentEntry>, type: string): Generator<ComponentEntry, void, void> {
  for (const entry of components) {
    if (entry.component.$type === type) {
      yield entry
    }
  }
}

export function invokeComponent(compilation: Compilation, component: { component: ComponentAny, config: Object }, ...parameters: Array<any>): Promise<any> {
  return component.component.callback.apply(compilation, [
    // $FlowIgnore: Flow gets confused with so many times
    Object.assign({}, component.component.defaultConfig, component.config),
  ].concat(parameters))
}

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
  }
  file.contents = result.contents
}
