'use strict'

/* @flow */

import type FileSystem from './fs'
import type { Stats } from 'fs'

export type Pundle$Config = {
  mainFile: string,
  fileSystem: FileSystem,
  rootDirectory: string
}

export type Pundle$Module = {
  body: string,
  stats: Stats,
  imports: Array<string>,
  filePath: string,
  compiled: string
}
