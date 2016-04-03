'use babel'

/* @flow */

import Path from 'path'
import type { Pundle$Config, Pundle$FileSystem } from './types'

let FileSystem

export function normalizeConfig(givenConfig: Pundle$Config): Pundle$Config {
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
  // Make sure we have a FileSystem on board
  if (!config.FileSystem) {
    if (!FileSystem) {
      FileSystem = require('pundle-fs')
    }
    config.FileSystem = FileSystem
  }
  if (!config.resolve) {
    config.resolve = {}
  }
  return config
}

export async function find(
  directory: string,
  name: string | Array<string>,
  fs: Pundle$FileSystem
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
