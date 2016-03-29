'use strict'

/* @flow */

import Path from 'path'
import resolve from 'resolve'
import FileSystem from './fs'
import type { Pundle$Config, Pundle$State } from './types'

export function getModulePath(moduleName: string, filePath: string, state: Pundle$State): string {
  if (resolve.isCore(moduleName)) {
    return moduleName
  }
  if (state.config.resolve.aliases[moduleName]) {
    moduleName = state.config.resolve.aliases[moduleName]
  }
  return state.puth.in(state.config.fileSystem.resolveSync(moduleName, Path.dirname(filePath)))
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
  if (!config.resolve) {
    config.resolve = {}
  }
  if (!config.resolve.aliases) {
    config.resolve.aliases = {}
  }
}
