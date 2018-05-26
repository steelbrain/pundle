// @flow

import resolveFrom from 'resolve-from'

export function getBabelCore(rootDirectory: string): ?Object {
  const resolved = resolveFrom(rootDirectory, '@babel/core', true) || resolveFrom(rootDirectory, 'babel-core', true) || null

  if (resolved) {
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  }
  return null
}
