/* @flow */

import invariant from 'assert'
import type { Middleware } from '../types'

export function fillConfig(config: Object): Middleware {
  const toReturn = {}

  if (typeof config.hmrPath !== 'undefined') {
    if (config.hmrPath) {
      invariant(typeof config.hmrPath === 'string', 'config.hmrPath must be a string or null')
      toReturn.hmrPath = config.hmrPath
    } else toReturn.hmrPath = null
  } else toReturn.hmrPath = '/__sb_pundle_hmr'
  if (config.bundlePath) {
    invariant(typeof config.bundlePath === 'string', 'config.bundlePath must be a string')
    toReturn.bundlePath = config.bundlePath
  } else toReturn.bundlePath = '/bundle.js'
  if (config.publicPath) {
    invariant(typeof config.publicPath === 'string', 'config.publicPath must be a string')
    toReturn.publicPath = config.publicPath
  } else toReturn.publicPath = '/'
  if (config.sourceMapPath) {
    invariant(typeof config.sourceMapPath === 'string', 'config.sourceMapPath must be a string')
    toReturn.sourceMapPath = config.sourceMapPath
  } else toReturn.sourceMapPath = '/bundle.js.map'

  return toReturn
}
