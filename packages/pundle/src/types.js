'use strict'

/* @flow */

import type { Stats } from 'fs'

export type Pundle$FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Pundle$Config = {
  entry: Array<string>,
  resolve: Object,
  plugins: Array<String | Function>,
  FileSystem: Function,
  rootDirectory: string,
}

// Not used anywhere
export type Pundle$Config$User = {
  entry: string | Array<string>,
  resolve?: Object,
  plugins?: Array<String | Function>,
  FileSystem?: Function,
  rootDirectory: string,
}

export type Pundle$Module = {
  imports: Array<string>,
  sources: string,
  contents: string,
  filePath: string
}
