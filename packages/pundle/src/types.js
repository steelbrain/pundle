/* @flow */

import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Config = {
  debug: boolean,
  entry: Array<string>,
  output: {
    filename: string,
    pathType: 'number' | 'filePath',
    directory: string,
    publicPath: ?string,
    // ^ Optional until you use the loaders that require this. They'll throw if this is not set
    sourceFileName: string,
  },
  resolve: {
    alias: Object, // Object<key, value>
    extensions: Array<string>,
    packageMains: Array<string>,
    modulesDirectories: Array<string>,
  },
  fileSystem: FileSystem,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

export type Component = string | Function | [string, Object] | [Function, Object]
