/* @flow */

import type { Stats } from 'fs'
import type { Component as BaseComponent } from 'pundle-api/types'

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

export type Component<T1, T2> = BaseComponent<T1, T2> & {
  pundleConfig: Object,
}
export type ConfigComponent = string | [string, Object]

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
