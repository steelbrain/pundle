/* @flow */

const PundleFS = require('pundle-fs')
import type { Config } from './types'

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
  toReturn.development = Boolean(config.development)
  if (config.rootDirectory && typeof config.rootDirectory === 'string') {
    toReturn.rootDirectory = config.rootDirectory
  } else {
    throw new Error('config.rootDirectory must be a String')
  }
  toReturn.replaceVariables = { 'process.env.NODE_ENV': JSON.stringify(toReturn.development ? 'development' : 'production') }
  if (config.moduleDirectories) {
    if (!Array.isArray(config.moduleDirectories)) {
      throw new Error('config.moduleDirectories must be an Array')
    }
    toReturn.moduleDirectories = config.moduleDirectories
  } else {
    toReturn.moduleDirectories = []
  }
  return toReturn
}

export function attachable(key: string) {
  return function(SourceClass: Function) {
    Object.defineProperty(SourceClass, 'attach', {
      enumerable: false,
      value(TargetClass: Object) {
        const values = new WeakMap()
        Object.defineProperty(TargetClass.prototype, key, {
          enumerable: true,
          get() {
            let value = values.get(this)
            if (value) {
              return value
            }
            values.set(this, value = new SourceClass(this.state, this.config))
            if (typeof value.dispose === 'function') {
              this.subscriptions.add(value)
            }
            return value
          },
          set(newValue) {
            values.set(this, newValue)
          }
        })
      }
    })
  }
}
