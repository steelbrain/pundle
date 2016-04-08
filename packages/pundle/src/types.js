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
  FileSystem: Function,
  rootDirectory: string,
  sourceMaps: boolean,
  replaceVariables: Object // <string, Object>
}

// Not used anywhere
export type Pundle$Config$User = {
  entry: string | Array<string>,
  resolve?: Object,
  FileSystem?: Function,
  rootDirectory: string,
  sourceMaps?: boolean,
  replaceVariables?: Object // <string, string>
}

export type Pundle$Module = {
  imports: Array<string>,
  sources: string,
  contents: string,
  filePath: string,
  sourceMap: Object
}

export type Pundle$Watcher$Options = {
  ignored: string | RegExp,
  onBeforeCompile?: ((filePath: string) => void),
  onAfterCompile?: ((filePath: string, error: ?Error) => void),
  onReady?: (() => void),
  onError: ((error: Error) => void)
}

export type Pundle$Watcher$Options$User = {
  ignored?: string | RegExp,
  onBeforeCompile?: ((filePath: string) => void),
  onAfterCompile?: ((filePath: string, error: ?Error) => void),
  onReady?: (() => void),
  onError: ((error: Error) => void)
}

export type Pundle$Plugin = string | Function | [string, Object] | [Function, Object]
