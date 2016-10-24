/* @flow */

import Path from 'path'
import PundleFS from 'pundle-fs'
import type { Config } from './types'

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
    toReturn.rootDirectory = Path.resolve(config.rootDirectory)
  } else {
    throw new Error('config.rootDirectory must be a string')
  }
  toReturn.replaceVariables = Object.assign({
    'process.env.NODE_ENV': (process.env.NODE_ENV || 'development'),
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
