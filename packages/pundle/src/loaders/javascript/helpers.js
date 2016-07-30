/* @flow */

import { VISITOR_KEYS } from 'babel-types'
import { SourceMapConsumer } from 'source-map'

const sourceMapConsumers: WeakMap<Object, SourceMapConsumer> = new WeakMap()

export function resolveRealPathOfError(error: Object, node: Object, sourceMap: ?Object): Object {
  if (error.code !== 'MODULE_NOT_FOUND' || !node.loc) {
    return error
  }
  let originalPosition
  if (sourceMap) {
    let consumer = sourceMapConsumers.get(sourceMap)
    if (!consumer) {
      sourceMapConsumers.set(sourceMap, consumer = new SourceMapConsumer(sourceMap))
    }
    originalPosition = consumer.originalPositionFor({ line: node.loc.start.line, column: node.loc.start.column + 1 })
  }
  if (originalPosition) {
    error.stack = `${error.message}\n    at ${originalPosition.source}:${originalPosition.line}:${originalPosition.column}`
  } else {
    error.stack = error.stack.replace(':0:0', `:${node.loc.start.line}:${node.loc.start.column + 1}`)
  }
  return error
}

export function traverse(node: Object, enter: Function) {
  if (!node) return
  const keys = VISITOR_KEYS[node.type]
  if (!keys) return

  for (let i = 0, length = keys.length; i < length; ++i) {
    const key = keys[i]
    let subNode = node[key]

    if (Array.isArray(subNode)) {
      for (let k = 0, klength = subNode.length; k < klength; ++k) {
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
