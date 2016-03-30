'use babel'

/* @flow */

import Path from 'path'
import type { Pundle$Config } from './types'

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
  if (!config.resolve.alias) {
    config.resolve.alias = {}
  }
  return config
}
