'use strict'

/* @flow */

import Path from 'path'
import FileSystem from './fs'
import type { Pundle$Config } from './types'

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
  if (!this.config.fileSystem) {
    this.config.fileSystem = new FileSystem(config)
  }
}
