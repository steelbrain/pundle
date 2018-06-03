// @flow

import resolveFrom from 'resolve-from'

export function getPostcss(rootDirectory: string): ?Function {
  const resolved = resolveFrom(rootDirectory, 'postcss', true) || null

  if (resolved) {
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  }
  return null
}
