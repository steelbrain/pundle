'use strict'

/* @flow */

import Path from 'path'
import FileSystem from './fs'
import type { Pundle$Config } from './types'

export function moduleDirectory(filePath: string, config: Pundle$Config): string {
  const requestDirectory = Path.dirname(filePath)
  if (!Path.isAbsolute(requestDirectory)) {
    return Path.resolve(config.rootDirectory, requestDirectory)
  }
  return requestDirectory
}

export function getModuleId(filePath: string, config: Pundle$Config): string {
  if (Path.isAbsolute(filePath)) {
    return Path.relative(config.rootDirectory, filePath)
  }
  return filePath
}

export function normalizeConfig(config: Pundle$Config) {
  if (!Array.isArray(config.entry)) {
    config.entry = [config.entry]
  }
  for (let i = 0; i < config.entry.length; ++i) {
    const entry = config.entry[i]
    if (!Path.isAbsolute(entry)) {
      config.entry[i] = Path.join(config.rootDirectory, entry)
    }
  }
  if (!config.fileSystem) {
    config.fileSystem = new FileSystem(config)
  }
}
