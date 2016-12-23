/* @flow */

import Path from 'path'
import invariant from 'assert'
import type { CLIConfig } from './types'

export function fillCLIConfig(config: Object): CLIConfig {
  const output = config.output || {}
  const server = config.server || {}
  const toReturn = {}

  toReturn.output = {}
  toReturn.server = {}

  if (output.bundlePath) {
    invariant(typeof output.bundlePath === 'string', 'config.output.bundlePath must be a string')
    toReturn.output.bundlePath = output.bundlePath
  } else toReturn.output.bundlePath = 'bundle.js'
  toReturn.output.sourceMap = !!output.sourceMap
  if (output.sourceMapPath) {
    invariant(typeof output.sourceMapPath === 'string', 'config.output.sourceMapPath must be a string')
    toReturn.output.sourceMapPath = output.sourceMapPath
  } else toReturn.output.sourceMapPath = 'bundle.js.map'

  if (server.port) {
    invariant(typeof server.port === 'number' && Number.isFinite(server.port), 'config.server.port must be a valid number')
    toReturn.server.port = server.port
  } else toReturn.server.port = 8080
  if (server.hmrPath) {
    invariant(typeof server.hmrPath === 'string', 'config.server.hmrPath must be a string')
    toReturn.server.hmrPath = server.hmrPath
  } else toReturn.server.hmrPath = '/__sb_pundle_hmr'
  if (server.hmrHost) {
    invariant(typeof server.hmrHost === 'string', 'config.server.hmrHost must be a string')
    toReturn.server.hmrHost = server.hmrHost
  } else toReturn.server.hmrHost = ''
  if (server.bundlePath) {
    invariant(typeof server.bundlePath === 'string', 'config.server.bundlePath must be a string')
    toReturn.server.bundlePath = server.bundlePath
  } else toReturn.server.bundlePath = '/bundle.js'
  toReturn.server.sourceMap = !!server.sourceMap
  if (server.devDirectory) {
    invariant(typeof server.devDirectory === 'string', 'config.server.sourceMapPath must be a string')
    toReturn.server.devDirectory = server.devDirectory
  } else toReturn.server.devDirectory = Path.dirname(toReturn.output.bundlePath)
  if (server.sourceMapPath) {
    invariant(typeof server.sourceMapPath === 'string', 'config.server.sourceMapPath must be a string')
    toReturn.server.sourceMapPath = server.sourceMapPath
  } else toReturn.server.sourceMapPath = '/bundle.js.map'
  if (typeof server.redirectNotFoundToIndex !== 'undefined') {
    toReturn.server.redirectNotFoundToIndex = !!server.redirectNotFoundToIndex
  } else toReturn.server.redirectNotFoundToIndex = true

  toReturn.server.hmrReports = typeof server.hmrReports === 'undefined' ? true : !!server.hmrReports

  return toReturn
}
