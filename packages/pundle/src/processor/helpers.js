'use strict'

/* @flow */

import { VISITOR_KEYS } from 'babel-types'

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
