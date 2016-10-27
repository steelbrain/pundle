/* @flow */

import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type Config = {
  debug: boolean,
  entry: Array<string>,
  fileSystem: FileSystem,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

export type ComponentConfig = string | [string, Object]
export type Preset = Array<{ component: string | Object, config: Object, name: string }>

/*
// TODO: Implement this in pundle-generator-default
  output: {
    filename: string,
    pathType: 'number' | 'filePath',
    directory: string,
    publicPath: ?string,
    // ^ Optional until you use the loaders that require this. They'll throw if this is not set
    sourceFileName: string,
  }
*/
