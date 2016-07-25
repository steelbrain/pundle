/* @flow */

import type { Stats } from 'fs'
import type Pundle from './'

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

export type GeneratorConfig = {
  // ... Anything else that the generate function accepts ...
  generate: ((pundle: Pundle, contents: Array<File>, requires: Array<string>, config: GeneratorConfig) => any)
}
