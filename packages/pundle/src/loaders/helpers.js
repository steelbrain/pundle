/* @flow */

import sourceMap from 'source-map'

// Source: https://goo.gl/KRq4vl :: 368
export function mergeSourceMaps(inputMap: Object, map: Object): Object {
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
