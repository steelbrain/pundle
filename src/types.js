'use strict'

/* @flow */

import type Puth from './puth'
import type FileSystem from './fs'

export type Pundle$Config = {
  entry: Array<string>,
  fileSystem: FileSystem,
  rootDirectory: string
}

export type Pundle$State = {
  puth: Puth,
  config: Pundle$Config
}

export type Pundle$Module = {
  content: string,
  imports: Array<string>,
  filePath: string
}
