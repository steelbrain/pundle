/* @flow */

import OS from 'os'
import FS from 'sb-fs'
import Path from 'path'
import Crypto from 'crypto'
import invariant from 'assert'
import type Pundle from 'pundle/src'

import type { ServerConfig, ServerConfigInput } from '../types'

export const browserFile = require.resolve('./browser')
export function fillConfig(given: ServerConfigInput): ServerConfig {
  const config = {}

  if (given.hmrHost) {
    invariant(typeof given.hmrHost === 'string', 'config.hmrHost must be a string')
    config.hmrHost = given.hmrHost
  } else config.hmrHost = null
  if (given.hmrPath) {
    invariant(typeof given.hmrPath === 'string', 'config.hmrPath must be a string')
    config.hmrPath = given.hmrPath
  } else config.hmrHost = '__sb_pundle_hmr'
  if (typeof given.useCache !== 'undefined') {
    config.useCache = !!given.useCache
  } else config.useCache = true
  if (typeof given.hmrReports !== 'undefined') {
    config.hmrReports = !!given.hmrReports
  } else config.hmrReports = true
  if (given.bundlePath) {
    invariant(typeof given.bundlePath === 'string', 'config.bundlePath must be a string')
    config.bundlePath = given.bundlePath
  } else config.bundlePath = '/bundle.js'
  if (typeof given.sourceMap !== 'undefined') {
    config.sourceMap = !!given.sourceMap
  } else config.sourceMap = true
  if (given.sourceMapPath) {
    invariant(typeof given.sourceMapPath === 'string', 'config.sourceMapPath must be a string')
    config.sourceMapPath = given.sourceMapPath
  } else config.sourceMapPath = `${config.bundlePath}.map`

  invariant(given.port && typeof given.port === 'number', 'config.port must be a valid number')
  invariant(given.rootDirectory && typeof given.rootDirectory === 'string', 'config.rootDirectory must be a valid string')
  config.port = given.port
  config.rootDirectory = given.rootDirectory
  config.redirectNotFoundToIndex = !!given.redirectNotFoundToIndex

  return config
}

export async function getCacheFilePath(directory: string): Promise<string> {
  const stateDirectory = Path.join(OS.homedir(), '.pundle')
  try {
    await FS.stat(stateDirectory)
  } catch (error) {
    if (error.code === 'ENOENT') {
      await FS.mkdir(stateDirectory)
    } else throw error
  }

  const inputHash = Crypto.createHash('sha1').update(directory).digest('hex')
  return Path.join(stateDirectory, `${inputHash}.json`)
}

export function isPundleRegistered(pundle: Pundle): boolean {
  return pundle.config.entry.indexOf(browserFile) !== -1 ||
         pundle.config.replaceVariables.SB_PUNDLE_HMR_PATH ||
         pundle.config.replaceVariables.SB_PUNDLE_HMR_PATH
}

export function registerPundle(pundle: Pundle, config: ServerConfig): void {
  pundle.config.entry.unshift(browserFile)
  pundle.config.replaceVariables.SB_PUNDLE_HMR_PATH = JSON.stringify(config.hmrPath)
  pundle.config.replaceVariables.SB_PUNDLE_HMR_HOST = JSON.stringify(config.hmrHost)
}

export function unregisterPundle(pundle: Pundle): void {
  delete pundle.config.replaceVariables.SB_PUNDLE_HMR_PATH
  delete pundle.config.replaceVariables.SB_PUNDLE_HMR_HOST
  const browserFileIndex = pundle.config.entry.indexOf(browserFile)
  if (browserFileIndex !== -1) {
    pundle.config.entry.splice(browserFileIndex, 1)
  }
}

export function getWssServer(): Function {
  try {
    return require('uws').Server
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error
    }
    return require('ws').Server
  }
}

export function getChunkId(url: string, bundlePath: string): string {
  const expected = Path.basename(bundlePath)
  const expectedExt = expected.endsWith('.js.map') ? '.js.map' : Path.extname(expected)
  const expectedPrefix = expected.slice(0, -1 * expectedExt.length)

  const given = Path.basename(url).slice(expectedPrefix.length + 1)
  const givenExt = given.endsWith('.js.map') ? '.js.map' : Path.extname(given)
  const givenId = given.slice(0, -1 * givenExt.length)

  return givenId || '1'
}
