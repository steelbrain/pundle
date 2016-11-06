/* @flow */

import type { File } from 'pundle-api/types'
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
  publicPath: ?string,
  replaceVariables: Object, // <string, Object>
}

export type WatcherConfig = {
  usePolling: boolean,
  tick(filePath: string, error: ?null): Promise<void> | void,
  update(filePath: string, newImports: Array<string>, oldImports: Array<string>): Promise<void> | void,
  ready(initialCompileStatus: boolean, totalFiles: Array<File>): Promise<void> | void,
  compile(totalFiles: Array<File>): Promise<void> | void,
}

export type ComponentConfig = string | [string, Object]
export type Preset = Array<{ component: string | Object, config: Object, name: string }>
