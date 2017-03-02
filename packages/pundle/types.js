/* @flow */

import type { ComponentAny } from 'pundle-api/types'

export type ComponentEntry = {
  config: Object,
  component: ComponentAny,
}

export type CompilationConfig = {
  debug: boolean,
  entry: Array<string>,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

export type WatcherConfig = {
  usePolling: boolean,
}

export type Preset = Array<{ component: string | Object, config: Object, name: string }>
export type Loaded = [Object, Object]
export type Loadable = string | [string, Object] | [Object, Object]

// NOTE: This is the config after transformation, not what Pundle accepts
export type PundleConfig = {
  watcher: Object,
  presets: Array<Loadable>,
  components: Array<Loadable>,
  compilation: CompilationConfig,
}

// NOTE: Not used anywhere but this is what Pundle supports publically
export type PublicPundleConfig = CompilationConfig & {
  output: {
    bundlePath?: string,
    sourceMap?: boolean,
    sourceMapPath?: string,
    rootDirectory?: string,
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
  presets?: Array<Loadable>,
  components?: Array<Loadable>,
  configFileName?: string,
  enableConfigFile: boolean,
}
