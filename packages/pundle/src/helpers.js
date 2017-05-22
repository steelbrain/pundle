/* @flow */
/* eslint-disable no-underscore-dangle */

import FS from 'sb-fs'
import OS from 'os'
import Path from 'path'
import Crypto from 'crypto'
import promisify from 'sb-promisify'
import { getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { File, PundleConfig, Loadable, Loaded } from 'pundle-api/types'

const resolve = promisify(require('resolve'))

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
export function unserializeFiles(files: Array<File>, oldFiles: Map<string, File>): Map<string, File> {
  files.forEach(function(file) {
    file.chunks = file.chunks.map(chunk => ({
      ...chunk,
      files: new Map(),
    }))
    oldFiles.set(file.filePath, file)
  })
  return oldFiles
}
export function serializeFiles(files: Map<string, File>) {
  return Array.from(files.values()).map(file => ({
    ...file,
    chunks: file.chunks.map(chunk => ({
      id: chunk.id,
      label: chunk.label,
      entries: chunk.entries,
      imports: chunk.imports,
    })),
  }))
}

export async function load(request: string | Object, rootDirectory: string): Promise<Object> {
  let resolved
  let mainModule
  if (typeof request === 'string') {
    try {
      resolved = await resolve(request, { basedir: rootDirectory })
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        const newError = new Error(`Unable to resolve '${request}' from root directory. Make sure it's installed correctly`)
        newError.code = 'MODULE_NOT_FOUND'
        throw newError
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
  if (!resolved) {
    // TODO: Structure this differently
    throw new Error(`Request '${request}' not resolved correctly`)
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

function merge(name: string, given: any, ...values: Array<any>): any {
  if (Array.isArray(given)) {
    return values.reduce((a, b) => {
      if (!b) {
        return a
      }
      // NOTE: We are allowing non-array values on purpose, concat pushes when value is non-array
      return a.concat(b)
    }, given)
  }
  if (typeof given === 'object' && given) {
    return Object.assign(given, ...values)
  }
  for (let i = 0, length = values.length; i < length; i++) {
    const value = values[i]
    if (typeof value !== 'undefined') {
      return value
    }
  }
  if (given === null) {
    throw new Error(`config.${name} is required`)
  }
  return given
}
async function loadConfigFile(rootDirectory: string, configFileName: ?string): Promise<Object> {
  let contents = {}
  let loadFileConfig = false
  const configPath = Path.join(rootDirectory, configFileName || '.pundle.js')

  try {
    await FS.stat(configPath)
    loadFileConfig = true
  } catch (_) { /* No Op */ }

  if (loadFileConfig) {
    const configModule = await load(configPath, rootDirectory)
    if (typeof configModule === 'function') {
      contents = await configModule()
    } else if (typeof configModule === 'object' && configModule) {
      contents = configModule
    }
    if (!contents) {
      throw new MessageIssue(`Invalid export value of config file in '${rootDirectory}'`)
    }
  }
  return contents
}

// NOTE:
// In all configs but rootDirectory, given config takes precendece
export async function getPundleConfig(rootDirectory: string, a: Object): Promise<PundleConfig> {
  const config = {}

  let b = {}
  if (typeof a !== 'object' || !a) {
    throw new Error('Config must be an object')
  }
  if (typeof a.enableConfigFile === 'undefined' || a.enableConfigFile) {
    b = await loadConfigFile(rootDirectory, a.configFileName)
  }

  config.debug = merge('debug', false, b.debug, a.debug)
  config.entry = merge('entry', [], b.entry, a.entry)
  config.output = merge('output', {}, b.output, a.output)
  config.server = merge('server', {}, b.server, a.server)
  config.presets = merge('presets', [], b.presets, a.presets)
  config.watcher = merge('watcher', { usePolling: {}.hasOwnProperty.call(process.env, 'PUNDLE_WATCHER_USE_POLLING') }, b.watcher, a.watcher)
  config.components = merge('components', [], b.components, a.components)
  config.rootDirectory = merge('rootDirectory', null, a.rootDirectory, b.rootDirectory)
  config.replaceVariables = merge('replaceVariables', {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  }, b.replaceVariables, a.replaceVariables)

  return config
}
