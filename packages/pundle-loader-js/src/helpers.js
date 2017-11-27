// @flow

import template from '@babel/template'

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

// TODO: Remove caching when upgrading to babel v7; it has caching built-in
const CACHED_TEMPLATES = new Map()
export function getParsedReplacement(templateString: string): Object {
  let cachedValue = CACHED_TEMPLATES.get(templateString)
  if (!cachedValue) {
    cachedValue = template(`(${templateString})`)().expression
    CACHED_TEMPLATES.set(templateString, cachedValue)
  }
  return cachedValue
}
