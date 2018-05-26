// @flow

import resolveFrom from 'resolve-from'

export function getTypescripti(rootDirectory: string): ?Object {
  const resolved = resolveFrom(rootDirectory, 'typescript', true) || null

  if (resolved) {
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  }
  return null
}
