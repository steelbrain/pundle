'use babel'

/* @flow */

import Path from 'path'
import FileSystem from 'pundle-fs'
import { parse } from 'babylon'
import uniq from 'lodash.uniq'
import type Pundle$Path from './path'
import type { Config, Plugin, FileSystemInterface } from './types'

export function normalizeConfig(givenConfig: Config): Config {
  const config = Object.assign({}, givenConfig)
  // Make sure config.entry is an array
  if (!Array.isArray(config.entry)) {
    config.entry = [config.entry]
  }
  // Make sure config.entry is filled with absolute paths
  for (let i = 0; i < config.entry.length; ++i) {
    const entry = config.entry[i]
    if (!Path.isAbsolute(entry)) {
      config.entry[i] = Path.join(config.rootDirectory, entry)
    }
  }
  config.entry = uniq(['$internal'].concat(config.entry))
  // Make sure we have a FileSystem on board
  if (!config.FileSystem) {
    config.FileSystem = FileSystem
  }
  if (!config.resolve) {
    config.resolve = {}
  }
  if (!Array.isArray(config.resolve.packageMains)) {
    config.resolve.packageMains = ['browser', 'main']
  }
  if (!config.replaceVariables) {
    config.replaceVariables = {}
  }
  config.replaceVariables = Object.assign({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }, config.replaceVariables)
  for (const key in config.replaceVariables) {
    if (config.replaceVariables.hasOwnProperty(key)) {
      config.replaceVariables[key] = parse(`_(${config.replaceVariables[key]})`).program.body[0].expression.arguments[0]
    }
  }
  config.sourceMaps = Boolean(config.sourceMaps)
  return config
}

export async function find(
  directory: string,
  name: string | Array<string>,
  fs: FileSystemInterface
): Promise<Array<string>> {
  const names = [].concat(name)
  const chunks = directory.split(Path.sep)
  const matched = []

  while (chunks.length) {
    let currentDir = chunks.join(Path.sep)
    if (currentDir === '') {
      currentDir = Path.resolve(directory, '/')
    }
    for (const fileName of names) {
      const filePath = Path.join(currentDir, fileName)
      try {
        await fs.stat(filePath)
        matched.push(filePath)
        break
      } catch (_) {
        // Do nothing
      }
    }
    chunks.pop()
  }

  return matched
}

export async function getPlugins(
  plugins: Array<Plugin>,
  path: Pundle$Path,
  rootDirectory: string
): Promise<Array<{ plugin: Function, parameters: Object }>> {
  const processed = []
  for (const entry of plugins) {
    let plugin
    let parameters = {}
    if (typeof entry === 'function') {
      plugin = entry
      parameters = {}
    } else if (typeof entry === 'string') {
      plugin = path.out(await path.resolveModule(entry, rootDirectory))
    } else if (Array.isArray(entry)) {
      [plugin, parameters] = entry
    }
    if (typeof plugin === 'string') {
      // $FlowIgnore: I wanna use a variable in require
      const mainModule = require(plugin)
      if (typeof mainModule !== 'function') {
        throw new Error(`Plugin '${plugin}' exported incorrectly`)
      }
      plugin = mainModule
    } else if (typeof plugin !== 'function') {
      throw new Error(`Invalid plugin detected in '${entry}'`)
    }
    processed.push({ plugin, parameters })
  }
  return processed
}
