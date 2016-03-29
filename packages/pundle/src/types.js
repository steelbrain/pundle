'use strict'

/* @flow */

import type { Stats } from 'fs'

export type Pundle$FileSystem = {
  stat: ((path: string) => Promise<?Stats>),
  statSync: ((path: string) => Stats),
  resolve: ((moduleName: string, basedir: string) => Promise<string>),
  resolveSync: ((moduleName: string, basedir: string) => string),
  readFile: ((filePath: string) => Promise<string>),
  readFileSync: ((filePath: string) => string)
}

export type Pundle$Config = {
  entry: Array<string>,
  rootDirectory: string,
  FileSystem: Function
}

// Not used anywhere
export type Pundle$Config$User = {
  entry: string | Array<string>,
  rootDirectory: string,
  FileSystem?: Function
}
