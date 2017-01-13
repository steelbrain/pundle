/* @flow */

import * as t from 'babel-types'

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

const STRING_REGEX = /^"[^"]*"$/

export function getParsedReplacement(rawValue: any): Object {
  let parsedValue
  if (STRING_REGEX.test(rawValue)) {
    // Extract value between ""
    // Unescape backward slahes
    parsedValue = t.stringLiteral(JSON.parse(rawValue))
  } else if (typeof rawValue === 'number') {
    parsedValue = t.numericLiteral(rawValue)
  } else {
    parsedValue = t.identifier(rawValue)
  }
  return parsedValue
}
