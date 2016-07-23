/* @flow */

import type Pundle from './'
import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Config = {
  entry: Array<string>,
  pathType: 'number' | 'filePath',
  fileSystem: FileSystem,
  development: boolean,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
  moduleDirectories: Array<string>,
}

export type WatcherConfig = {
  ready: (() => any),
  usePolling: boolean,
  error: ((error: Error) => any),
}

export type LoaderResult = {
  imports: Set<string>,
  contents: string,
  sourceMap: Object,
}

export type Loader = ((pundle: Pundle, filePath: string, source: string, sourceMap: ?Object) => LoaderResult | Promise<LoaderResult>)
export type State = {
  loaders: Map<string, Loader>,
}

export type File = {
  source: string,
  imports: Set<string>,
  filePath: string,
  contents: string,
  sourceMap: Object
}

export type Manifest = {
  name?: string,
  version?: string,
  browser?: string | Object,
}

export type Plugin = string | Function | [string, Object] | [Function, Object]
