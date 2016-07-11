'use strict'

/* @flow */

import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Config = {
  entry: Array<string>,
  fileSystem: FileSystem,
  development: boolean,
  rootDirectory: string,
  replaceVariables: Object // <string, Object>
}

export type Module = {
  imports: Array<string>,
  sources: string,
  contents: string,
  filePath: string,
  sourceMap: Object
}

export type WatcherConfig = {
  ignored: string | RegExp,
  onBeforeCompile?: ((filePath: string) => void),
  onAfterCompile?: ((filePath: string, error: ?Error) => void),
  onReady?: (() => void),
  onError: ((error: Error) => void)
}

export type ProcessorConfig = {
  append?: string,
  prepend?: string,
  module_register: string
}

export type Plugin = string | Function | [string, Object] | [Function, Object]
