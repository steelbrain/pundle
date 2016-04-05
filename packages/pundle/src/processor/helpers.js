'use strict'

/* @flow */

export function getName(obj: Object): string {
  const chunks = []
  if (typeof obj.name === 'string') {
    chunks.push(obj.name)
  }
  if (typeof obj.object === 'object') {
    chunks.push(getName(obj.object))
  }
  if (typeof obj.property === 'object') {
    chunks.push(getName(obj.property))
  }
  return chunks.join('.')
}
