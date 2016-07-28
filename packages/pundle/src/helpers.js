/* @flow */

import Path from 'path'
import PundleFS from 'pundle-fs'
import PundleGenerator from 'pundle-generator'
import type Pundle from './'
import type { Config, WatcherConfig, GeneratorConfig } from './types'

let pathIDNumber = 0
export const pathIDMap = new Map()

export function fillConfig(config: Object): Config {
  const toReturn = {}
  if (config.entry && typeof config.entry === 'string') {
    toReturn.entry = [config.entry]
  } else if (Array.isArray(config.entry)) {
    toReturn.entry = config.entry
  } else {
    throw new Error('config.entry should be a String or an Array')
  }
  if (config.fileSystem) {
    if (typeof config.fileSystem !== 'object' || typeof config.fileSystem.stat !== 'function' || typeof config.fileSystem.readFile !== 'function') {
      throw new Error('config.fileSystem must be an object implementing FS interface')
    }
    toReturn.fileSystem = config.fileSystem
  } else {
    toReturn.fileSystem = PundleFS
  }
  if (config.rootDirectory && typeof config.rootDirectory === 'string') {
    toReturn.rootDirectory = config.rootDirectory
  } else {
    throw new Error('config.rootDirectory must be a string')
  }
  toReturn.replaceVariables = Object.assign({
    'process.env.NODE_ENV': toReturn.development ? 'development' : 'production',
  }, config.replaceVariables)
  if (config.moduleDirectories) {
    if (!Array.isArray(config.moduleDirectories)) {
      throw new Error('config.moduleDirectories must be an Array')
    }
    toReturn.moduleDirectories = config.moduleDirectories
  } else {
    toReturn.moduleDirectories = ['node_modules']
  }
  if (config.pathType) {
    if (config.pathType === 'number' || config.pathType === 'filePath') {
      toReturn.pathType = config.pathType
    } else {
      throw new Error("config.pathType must be either 'number' or 'filePath'")
    }
  } else {
    toReturn.pathType = 'number'
  }
  return toReturn
}

export function fillWatcherConfig(config: Object): WatcherConfig {
  const toReturn = {}
  if (!config || typeof config !== 'object') {
    throw new Error('config must be valid')
  }
  if (config.ready) {
    if (typeof config.ready !== 'function') {
      throw new Error('config.ready must be a function')
    }
    toReturn.ready = config.ready
  } else {
    toReturn.ready = function() { /* No Op */ }
  }
  if (typeof config.error !== 'function') {
    throw new Error('config.error must be a function')
  }
  toReturn.error = config.error
  if (typeof config.generate !== 'function') {
    throw new Error('config.generate must be a function')
  }
  toReturn.generate = config.generate
  if (typeof config.usePolling !== 'undefined') {
    toReturn.usePolling = Boolean(config.usePolling)
  } else if ({}.hasOwnProperty.call(process.env, 'PUNDLE_FS_USE_POLLING')) {
    toReturn.usePolling = true
  } else {
    toReturn.usePolling = false
  }
  return toReturn
}

export function attachable(key: string) {
  const values = new WeakMap()
  return function(SourceClass: Function) {
    Object.defineProperty(SourceClass, 'attach', {
      enumerable: false,
      value(TargetClass: Object) {
        Object.defineProperty(TargetClass.prototype, key, {
          enumerable: true,
          get() {
            let value = values.get(this.state)
            if (value) {
              return value
            }
            values.set(this.state, value = new SourceClass(this.state, this.config))
            if (typeof value.dispose === 'function') {
              this.subscriptions.add(value)
            }
            return value
          },
          set(newValue) {
            values.set(this.state, newValue)
          },
        })
      },
    })
  }
}

export async function find(
  directory: string,
  name: string | Array<string>,
  config: Config,
  earlyExit: boolean = false
): Promise<Array<string>> {
  const names = [].concat(name)
  const chunks = directory.split(Path.sep)
  const matched = []

  while (chunks.length) {
    let currentDir = chunks.join(Path.sep)
    if (currentDir === '') {
      currentDir = Path.resolve(directory, '/')
    }
    for (let i = 0, length = names.length; i < length; ++i) {
      const fileName = names[i]
      const filePath = Path.join(currentDir, fileName)
      try {
        await config.fileSystem.stat(filePath)
        matched.push(filePath)
        if (earlyExit) {
          return matched
        }
        break
      } catch (_) { /* Ignore */ }
    }
    chunks.pop()
  }

  return matched
}

export function getPathID(filePath: string): number {
  let value = pathIDMap.get(filePath)
  if (typeof value === 'number') {
    return value
  }
  pathIDMap.set(filePath, value = ++pathIDNumber)
  return value
}

export function isEverythingIn(pundle: Pundle, items: Array<string> | Set<string> = pundle.config.entry, itemsAdded: Set<string> = new Set()): boolean {
  for (const item of items) {
    if (itemsAdded.has(item)) {
      continue
    }

    const module = pundle.files.get(item)
    if (!module) {
      return false
    }
    itemsAdded.add(item)
    if (!module.imports.size) {
      continue
    }
    if (!isEverythingIn(pundle, module.imports, itemsAdded)) {
      return false
    }
  }
  return true
}

export function getAllImports(pundle: Pundle, items: Array<string> | Set<string> = pundle.config.entry, itemsAdded: Set<string> = new Set()): Set<string> {
  for (const item of items) {
    const pathIn = pundle.path.in(item)
    if (itemsAdded.has(pathIn)) {
      continue
    }

    const module = pundle.files.get(pathIn)
    if (!module) {
      throw new Error(`Module not found '${item}'`)
    }
    itemsAdded.add(pathIn)
    if (!module.imports.size) {
      continue
    }
    getAllImports(pundle, module.imports, itemsAdded)
  }
  return itemsAdded
}

export async function getPlugins(
  pundle: Pundle,
  plugins: Array<Plugin>
): Promise<Array<{ plugin: Function, parameters: Object }>> {
  const processed = []
  for (const entry of (plugins: Array<Plugin>)) {
    let plugin
    let parameters = {}
    if (typeof entry === 'function') {
      plugin = entry
      parameters = {}
    } else if (typeof entry === 'string') {
      plugin = pundle.path.out(await pundle.resolver.resolve(entry, '$root/pundle-plugin-loader'))
    } else if (Array.isArray(entry)) {
      [plugin, parameters] = entry
    }
    if (typeof plugin === 'string') {
      /* eslint-disable global-require */
      // $FlowIgnore: I wanna use a variable in require
      let mainModule = require(plugin)
      // Support babel's export default
      /* eslint-disable no-underscore-dangle */
      mainModule = mainModule && mainModule.__esModule ? mainModule.default : mainModule
      if (typeof mainModule !== 'function') {
        throw new Error(`Plugin '${plugin}' exported incorrectly`)
      }
      plugin = mainModule
    } else if (typeof plugin !== 'function') {
      throw new Error('Invalid plugin detected')
    }
    processed.push({ plugin, parameters })
  }
  return processed
}

export function fillGeneratorConfig(config: Object, pundle: Pundle): GeneratorConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('config must be valid')
  }
  const toReturn = Object.assign({}, config)
  if (toReturn.generate) {
    if (typeof toReturn.generate !== 'function') {
      throw new Error('config.generate must be a function')
    }
  } else {
    toReturn.generate = PundleGenerator
  }
  if (toReturn.contents) {
    if (!Array.isArray(toReturn.contents)) {
      throw new Error('config.contents must be an Array')
    }
  } else {
    toReturn.contents = Array.from(getAllImports(pundle))
  }
  if (toReturn.requires) {
    if (!Array.isArray(toReturn.requires)) {
      throw new Error('config.requires must be an Array')
    }
  } else {
    toReturn.requires = pundle.config.entry
  }
  return toReturn
}
