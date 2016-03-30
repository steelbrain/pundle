'use strict'

/* @flow */

import type { Stats } from 'fs'

export type Pundle$FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  statSync: ((path: string) => Stats),
  resolve: ((moduleName: string, basedir: string) => Promise<string>),
  resolveSync: ((moduleName: string, basedir: string) => string),
  readFile: ((filePath: string) => Promise<string>),
  readFileSync: ((filePath: string) => string)
}

export type Pundle$Config = {
  entry: Array<string>,
  rootDirectory: string,
  FileSystem: Function,
  resolve: {
    alias: Object // <string, string>
  }
}

// Not used anywhere
export type Pundle$Config$User = {
  entry: string | Array<string>,
  rootDirectory: string,
  FileSystem?: Function,
  resolve?: {
    alias?: Object
  }
}

export type Pundle$Module = {
  imports: Array<string>,
  sources: string,
  contents: string,
  filePath: string
}
