// @flow

import resolveFrom from 'resolve-from'

export function getCoffeeScript(rootDirectory: string): ?Object {
  let resolved = null
  try {
    resolved = resolveFrom(rootDirectory, 'coffeescript')
  } catch (_) {
    /* No Op */
  }
  if (resolved) {
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  }
  return null
}
