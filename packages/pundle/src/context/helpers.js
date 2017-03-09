/* @flow */

import unique from 'lodash.uniq'
import invariant from 'assert'
import sourceMap from 'source-map'
import type { Context, File } from 'pundle-api/types'
import type { ComponentEntry } from '../../types'

export function filterComponents(components: Set<ComponentEntry>, type: string): Array<ComponentEntry> {
  const filtered = []
  components.forEach(function(entry) {
    if (entry.component.$type === type) {
      filtered.push(entry)
    }
  })
  return filtered
}

// Spec:
// - Validate method to exist on component
// - Clone all Objects in the parameters to make sure components can't override originals
// - Invoke the method requested on component with merged configs as first arg and params as others
export function invokeComponent(context: Context, entry: ComponentEntry, method: string, configs: Array<Object>, ...givenParameters: Array<any>) {
  invariant(typeof entry.component[method] === 'function', `Component method '${method}' does not exist on given component`)
  const parameters = givenParameters.map(function(item) {
    if (item && item.constructor === Object) {
      return Object.assign({}, item)
    }
    return item
  })
  return entry.component[method].apply(null, [context, Object.assign({}, entry.component.defaultConfig, entry.config, ...configs)].concat(parameters))
}

// NOTE: The reason we only count in loaders and not transformers even though they could be useful
// in cases like typescript is because the typescript preset includes it's own resolver.
// and it includes it's resolver because if the user decides to specify ext for the default preset one
// it'll break and users won't know why. so it just increases predictability.
export function getAllKnownExtensions(components: Set<ComponentEntry>): Array<string> {
  let toReturn = []
  for (const entry of components) {
    if (entry.component.$type === 'loader') {
      if (Array.isArray(entry.config.extensions)) {
        toReturn = toReturn.concat(entry.config.extensions)
      } else if (Array.isArray(entry.component.defaultConfig.extensions)) {
        toReturn = toReturn.concat(entry.component.defaultConfig.extensions)
      }
    }
  }
  return unique(toReturn)
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
