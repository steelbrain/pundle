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
  replaceVariables: Object, // <string, Object>
  moduleDirectories: Array<string>,
}

export type LoaderResult = {
  imports: Set<string>,
  contents: string,
  sourceMap: Object,
}

export type Loader = ((config: Config, filePath: string, source: string) => LoaderResult | Promise<LoaderResult>)
export type State = {
  loaders: Map<string, Loader>,
}

export type File = {
  source: string,
  imports: Set<string>,
  contents: string,
  sourceMap: Object
}

export type Package = {
  name: string,
  files: Map<string, File>,
  version: string,
  manifest: Object,
  rootDirectory: string,
}

export type Plugin = string | Function | [string, Object] | [Function, Object]
