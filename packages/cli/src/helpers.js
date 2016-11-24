/* @flow */

import Path from 'path'
import invariant from 'assert'
import type { CLIConfig } from './types'

export function fillCLIConfig(config: Object): CLIConfig {
  const output = config.output || {}
  const server = config.server || {}
  const toReturn = {}

  if (output.bundlePath) {
    invariant(typeof output.bundlePath === 'string' && output.bundlePath, 'output.bundlePath must be a string')
    toReturn.bundlePath = Path.isAbsolute(output.bundlePath)
      ? Path.relative(config.compilation.rootDirectory, output.bundlePath)
      : Path.normalize(output.bundlePath)
  } else toReturn.bundlePath = '/bundle.js'
  toReturn.sourceMap = !!output.sourceMap
  if (output.sourceMapPath) {
    invariant(typeof output.sourceMapPath === 'string' && output.sourceMapPath, 'output.sourceMapPath must be a string')
    toReturn.sourceMapPath = Path.isAbsolute(output.sourceMapPath)
      ? Path.relative(config.compilation.rootDirectory, output.sourceMapPath)
      : Path.normalize(output.sourceMapPath)
  } else toReturn.sourceMapPath = `${toReturn.bundlePath}.map`

  if (typeof server.notFoundToIndex !== 'undefined') {
    toReturn.notFoundToIndex = !!server.server
  } else toReturn.notFoundToIndex = true

  return toReturn
}
