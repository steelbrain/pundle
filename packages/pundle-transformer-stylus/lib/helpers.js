// @flow

import resolveFrom from 'resolve-from'

export function getStylus(rootDirectory: string): ?Function {
  let resolved = null
  try {
    resolved = resolveFrom(rootDirectory, 'stylus')
  } catch (_) {
    /* No Op */
  }
  if (resolved) {
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  }
  return null
}
