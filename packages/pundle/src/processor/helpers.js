'use strict'

/* @flow */

import sourceMap from 'source-map'
import { VISITOR_KEYS } from 'babel-types'

// Source: https://goo.gl/821D9T
export function mergeSourceMaps(inputMap: Object, map: Object): Object {
  const inputMapConsumer   = new sourceMap.SourceMapConsumer(inputMap)
  const outputMapConsumer  = new sourceMap.SourceMapConsumer(map)

  const mergedGenerator = new sourceMap.SourceMapGenerator({
    file: inputMapConsumer.file,
    sourceRoot: inputMapConsumer.sourceRoot
  })

  // This assumes the output map always has a single source, since Babel always compiles a single source file to a
  // single output file.
  const source = outputMapConsumer.sources[0]

  inputMapConsumer.eachMapping(function(mapping) {
    const generatedPosition = outputMapConsumer.generatedPositionFor({
      line: mapping.generatedLine,
      column: mapping.generatedColumn,
      source
    })
    if (typeof generatedPosition.column !== 'undefined') {
      mergedGenerator.addMapping({
        source: mapping.source,

        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn
        },

        generated: generatedPosition
      })
    }
  })

  const mergedMap = mergedGenerator.toJSON()
  inputMap.mappings = mergedMap.mappings
  return inputMap
}

export function getName(obj: Object): string {
  if (typeof obj.name === 'string') {
    return obj.name
  }
  const chunks = []
  if (typeof obj.object === 'object') {
    chunks.push(getName(obj.object))
  }
  if (typeof obj.property === 'object') {
    chunks.push(getName(obj.property))
  }
  return chunks.join('.')
}

export function traverse(node: Object, enter: Function) {
  if (!node) return
  const keys = VISITOR_KEYS[node.type]
  if (!keys) return

  for (let i = 0, _length = keys.length; i < _length; ++i) {
    const key = keys[i]
    let subNode = node[key]

    if (Array.isArray(subNode)) {
      for (let k = 0, length = subNode.length; k < length; ++k) {
        const value = enter(subNode[k])
        if (typeof value === 'object') {
          subNode[k] = value
        }
        traverse(subNode[k], enter)
      }
    } else if (subNode) {
      const value = enter(subNode)
      if (typeof value === 'object') {
        subNode = node[key] = value
      }
      traverse(subNode, enter)
    }
  }
}
