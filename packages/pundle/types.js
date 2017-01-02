/* @flow */

import type { ComponentAny } from 'pundle-api/types'
import type { Stats } from 'fs'

export type FileSystem = {
  stat: ((path: string) => Promise<Stats>),
  readFile: ((filePath: string) => Promise<string>),
}

export type CompilationConfig = {
  debug: boolean,
  entry: Array<string>,
  fileSystem: FileSystem,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

export type WatcherConfig = {
  usePolling: boolean,
}

export type Preset = Array<{ component: string | Object, config: Object, name: string }>
// NOTE: Direct T also is accepted but it confuses the hell out of flow so not writing it here
export type Loadable<T> = string | [string, Object] | [T, Object]
export type Loaded<T> = [T, Object]

// NOTE: This is the config after transformation, not what Pundle accepts
export type PundleConfig = {
  watcher: Object,
  presets: Array<Loadable<Preset>>,
  components: Array<Loadable<ComponentAny>>,
  compilation: CompilationConfig,
}

// NOTE: Not used anywhere but this is what Pundle supports publically
export type PublicPundleConfig = CompilationConfig & {
  output: {
    bundlePath?: string,
    sourceMap?: boolean,
    sourceMapPath?: string,
  },
  server: {
    port?: number,
    hmrHost?: string,
    hmrPath?: string,
    bundlePath?: string,
    sourceMapPath?: string,
    rootDirectory: string,
    redirectNotFoundToIndex?: boolean,
  },
  watcher?: WatcherConfig,
  presets?: Array<Loadable<Preset>>,
  components?: Array<Loadable<ComponentAny>>,
  configFileName?: string,
  enableConfigFile: boolean,
}
