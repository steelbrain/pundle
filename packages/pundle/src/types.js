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
  publicDirectory: ?string,
  replaceVariables: Object, // <string, Object>
}

export type ComponentConfig = string | [string, Object]
export type Preset = Array<{ component: string | Object, config: Object, name: string }>
