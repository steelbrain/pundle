/* @flow */

import invariant from 'assert'
import type { MiddlewareConfig, ServerConfig } from '../types'

export function fillMiddlewareConfig(config: Object): MiddlewareConfig {
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
  if (config.sourceMapPath) {
    invariant(typeof config.sourceMapPath === 'string', 'config.sourceMapPath must be a string')
    toReturn.sourceMapPath = config.sourceMapPath
  } else toReturn.sourceMapPath = '/bundle.js.map'

  return toReturn
}

export function fillServerConfig(config: Object): ServerConfig {
  const toReturn = {}

  if (config.port) {
    invariant(typeof config.port === 'number' && Number.isFinite(config.port), 'config.port must be a valid number')
    toReturn.port = config.port
  } else toReturn.port = 8080
  invariant(typeof config.directory === 'string' && config.directory, 'config.directory must be a string')
  toReturn.directory = config.directory
  toReturn.redirectNotFoundToIndex = !!config.redirectNotFoundToIndex

  return toReturn
}
