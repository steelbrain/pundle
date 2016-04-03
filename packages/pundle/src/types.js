'use strict'

/* @flow */

import type { Stats } from 'fs'

export type Pundle$FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Pundle$Config = {
  entry: Array<string>,
  rootDirectory: string,
  FileSystem: Function,
  resolve: Object
}

// Not used anywhere
export type Pundle$Config$User = {
  entry: string | Array<string>,
  rootDirectory: string,
  FileSystem?: Function,
  resolve?: Object
}

export type Pundle$Module = {
  imports: Array<string>,
  sources: string,
  contents: string,
  filePath: string
}
