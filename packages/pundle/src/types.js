/* @flow */

import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Config = {
  entry: Array<string>,
  pathType: 'number' | 'filePath',
  fileSystem: FileSystem,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
  moduleDirectories: Array<string>,
}

export type WatcherConfig = {
  usePolling: boolean,
  ready: (() => any),
  error: ((error: Error) => any),
  generate: (() => any),
}

export type Manifest = {
  name?: string,
  version?: string,
  browser?: string | Object,
}

export type Component = string | Function | [string, Object] | [Function, Object]
