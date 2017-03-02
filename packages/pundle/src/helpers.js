/* @flow */
/* eslint-disable no-underscore-dangle */

import FS from 'pundle-fs'
import Path from 'path'
import invariant from 'assert'
import promisify from 'sb-promisify'
import { getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { PundleConfig, Loadable, Loaded } from '../types'

const resolve = promisify(require('resolve'))
function getResolveError(request: string): Error {
  const error = new Error(`Unable to resolve '${request}' from root directory. Make sure it's installed correctly`)
  error.code = 'MODULE_NOT_FOUND'
  return error
}

export async function load(request: string | Object, rootDirectory: string): Promise<Object> {
  let resolved
  let mainModule
  if (typeof request === 'string') {
    try {
      resolved = await resolve(request, { basedir: rootDirectory })
    } catch (error) {
      if (error.message.startsWith('Cannot find module')) {
        throw getResolveError(request)
      }
      throw error
    }
    // $FlowIgnore: We have to. sorry.
    mainModule = require(resolved)
  } else mainModule = request
  if (mainModule && mainModule.__esModule) {
    mainModule = mainModule.default
  }
  if ((typeof mainModule === 'object' && mainModule) || typeof request === 'object') {
    return mainModule
  }
  throw new MessageIssue(`Module '${request.toString()}' (at '${getRelativeFilePath(resolved, rootDirectory)}') exported incorrectly`)
}

export async function getLoadables(loadables: Array<Loadable>, rootDirectory: string): Promise<Array<Loaded>> {
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
    const resolved = await load(component, rootDirectory)
    if (!resolved || typeof resolved.$type !== 'string') {
      throw new MessageIssue('Unable to load invalid component')
    }
    toReturn.push([resolved, config])
  }
  return toReturn
}


// TODO: Simplify this
// NOTE:
// In all configs but rootDirectory, given config takes precendece
export async function getPundleConfig(rootDirectory: string, a: Object): Promise<PundleConfig> {
  const config = {}

  let b = {}
  if (typeof a !== 'object' || !a) {
    throw new Error('Config must be an object')
  }
  if (typeof a.enableConfigFile === 'undefined' || a.enableConfigFile) {
    let loadFileConfig = false
    const configPath = Path.join(rootDirectory, a.configFileName || '.pundle.js')

    try {
      await FS.stat(configPath)
      loadFileConfig = true
    } catch (_) { /* No Op */ }

    if (loadFileConfig) {
      const configModule = await load(configPath, rootDirectory)
      if (typeof configModule === 'function') {
        b = await configModule()
      } else if (typeof configModule === 'object' && configModule) {
        b = configModule
      }
      if (!b) {
        throw new MessageIssue(`Invalid export value of config file in '${rootDirectory}'`)
      }
    }
  }

  // NOTE: This copies all even non-standard stuff from Pundle config file to
  // The config. This will allow any third party consumers to be able to define
  // custom stuff and then use it. For example, the API package uses this
  // to support output configurations
  Object.assign(config, b)

  config.watcher = {}
  if (b.watcher) {
    invariant(typeof b.watcher === 'object', 'config.watcher must be an Object')
    Object.assign(config.watcher, b.watcher)
  }
  if (a.watcher) {
    invariant(typeof a.watcher === 'object', 'config.watcher must be an Object')
    Object.assign(config.watcher, a.watcher)
  }
  config.presets = []
  if (a.presets) {
    invariant(Array.isArray(a.presets), 'config.presets must be an Array')
    config.presets = config.presets.concat(a.presets)
  }
  if (b.presets) {
    invariant(Array.isArray(b.presets), 'config.presets must be an Array')
    config.presets = config.presets.concat(b.presets)
  }
  config.components = []
  if (a.components) {
    invariant(Array.isArray(a.components), 'config.components must be an Array')
    config.components = config.components.concat(a.components)
  }
  if (b.components) {
    invariant(Array.isArray(b.components), 'config.components must be an Array')
    config.components = config.components.concat(b.components)
  }

  const compilation = {}
  if (typeof a.debug !== 'undefined') {
    compilation.debug = !!a.debug
  } else if (typeof b.debug !== 'undefined') {
    compilation.debug = !!b.debug
  } else {
    compilation.debug = process.env.NODE_ENV !== 'production'
  }
  compilation.entry = []
  if (!a.entry && !b.entry) {
    throw new MessageIssue('config.entry should be an Array or string')
  }
  if (a.entry) {
    invariant(typeof a.entry === 'string' || Array.isArray(a.entry), 'config.entry must be an Array or string')
    compilation.entry = compilation.entry.concat(a.entry)
  }
  if (b.entry) {
    invariant(typeof b.entry === 'string' || Array.isArray(b.entry), 'config.entry must be an Array or string')
    compilation.entry = compilation.entry.concat(b.entry)
  }
  if (!a.rootDirectory && !b.rootDirectory) {
    throw new MessageIssue('config.rootDirectory must be a string')
  }
  if (a.rootDirectory) {
    invariant(a.rootDirectory, 'config.rootDirectory must be a string')
    compilation.rootDirectory = a.rootDirectory
  }
  if (b.rootDirectory) {
    invariant(b.rootDirectory, 'config.rootDirectory must be a string')
    compilation.rootDirectory = b.rootDirectory
  }
  compilation.replaceVariables = Object.assign({}, {
    'process.env.NODE_ENV': config.debug ? '"development"' : '"production"',
  }, config.replaceVariables)
  if (b.replaceVariables) {
    invariant(typeof b.replaceVariables === 'object', 'config.replaceVariables must be an Object')
    Object.assign(compilation.replaceVariables, b.replaceVariables)
  }
  if (a.replaceVariables) {
    invariant(typeof a.replaceVariables === 'object', 'config.replaceVariables must be an Object')
    Object.assign(compilation.replaceVariables, a.replaceVariables)
  }

  config.compilation = compilation
  return config
}
