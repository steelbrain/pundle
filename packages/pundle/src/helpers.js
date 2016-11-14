/* @flow */

import PundleFS from 'pundle-fs'
import promisify from 'sb-promisify'
import { getRelativeFilePath } from 'pundle-api'
import type { PundleConfig, CompilationConfig, Loadable, Loaded } from './types'

const resolveModule = promisify(require('resolve'))

export function fillCompilationConfig(config: Object): CompilationConfig {
  const toReturn = {}

  toReturn.debug = !!config.debug
  if (config.entry && (typeof config.entry === 'string' || Array.isArray(config.entry))) {
    toReturn.entry = [].concat(config.entry)
  } else {
    throw new Error('config.entry should be a string or an Array')
  }

  if (config.fileSystem) {
    if (typeof config.fileSystem !== 'object' || typeof config.fileSystem.stat !== 'function' || typeof config.fileSystem.readFile !== 'function') {
      throw new Error('config.fileSystem must be an object implementing FS interface')
    }
    toReturn.fileSystem = config.fileSystem
  } else {
    toReturn.fileSystem = PundleFS
  }

  if (config.publicPath && typeof config.publicPath !== 'string') {
    throw new Error('config.publicPath must be a string')
  }
  toReturn.publicPath = config.publicPath || null

  if (typeof config.rootDirectory !== 'string' || !config.rootDirectory) {
    throw new Error('config.rootDirectory must be a string')
  }
  toReturn.rootDirectory = config.rootDirectory

  if (config.replaceVariables && typeof config.replaceVariables !== 'object') {
    throw new Error('config.replaceVariables must be an Object')
  }
  toReturn.replaceVariables = Object.assign({}, {
    'process.env.NODE_ENV': toReturn.debug ? '"development"' : '"production"',
  }, config.replaceVariables)

  return toReturn
}

export function fillPundleConfig(config: Object): PundleConfig {
  const toReturn = {}
  toReturn.compilation = fillCompilationConfig(config)
  if (config.watcher) {
    if (typeof config.watcher !== 'object') {
      throw new Error('config.watcher must be an Object')
    }
    toReturn.watcher = config.watcher
  } else toReturn.watcher = {}
  if (config.presets) {
    if (!Array.isArray(config.presets)) {
      throw new Error('config.presets must be an Array')
    }
    toReturn.presets = config.presets
  } else toReturn.presets = []
  if (config.components) {
    if (!Array.isArray(config.components)) {
      throw new Error('config.components must be an Array')
    }
    toReturn.components = config.components
  } else toReturn.components = []
  toReturn.enableConfigFile = typeof config.enableConfigFile === 'undefined' ? true : !!config.enableConfigFile
  return toReturn
}

export async function resolve<T>(request: string, rootDirectory: string): Promise<T> {
  let resolved
  try {
    resolved = await resolveModule(request, { basedir: rootDirectory })
  } catch (e) {
    throw new Error(`Unable to resolve '${request}' from root directory`)
  }
  /* eslint-disable global-require */
  // $FlowIgnore: This is how it works, loadables are dynamic requires
  let mainModule = require(resolved)
  /* eslint-enable global-require */
  // eslint-disable-next-line no-underscore-dangle
  mainModule = mainModule && mainModule.__esModule ? mainModule.default : mainModule
  if (typeof mainModule === 'object' && mainModule) {
    return mainModule
  }
  throw new Error(`Module '${request}' (at '${getRelativeFilePath(resolved, rootDirectory)}') exported incorrectly`)
}

export async function getLoadables<T>(loadables: Array<Loadable<T>>, rootDirectory: string): Promise<Array<Loaded<T>>> {
  const toReturn = []
  for (let i = 0, length = loadables.length; i < length; i++) {
    const entry = loadables[i]

    let config = {}
    let component
    if (Array.isArray(entry)) {
      [component, config] = entry
    } else {
      component = entry
    }
    if (typeof component === 'string') {
      toReturn.push([await resolve(component, rootDirectory), config])
    } else {
      toReturn.push([component, config])
    }
  }
  return toReturn
}
