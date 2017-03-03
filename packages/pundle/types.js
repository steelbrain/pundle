/* @flow */

import type { ComponentAny } from 'pundle-api/types'

export type ComponentEntry = {
  config: Object,
  component: ComponentAny,
}

export type Preset = Array<{ component: string | Object, config: Object, name: string }>
export type Loaded = [Object, Object]
export type Loadable = string | [string, Object] | [Object, Object]

// NOTE: This is the config after transformation, not what Pundle accepts
export type PundleConfig = {
  debug: boolean,
  entry: Array<string>,
  output: {
    sourceMap?: boolean,
    publicPath?: string,
    bundlePath?: string,
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
  presets: Array<Loadable>,
  watcher: {
    usePolling: boolean,
  },
  components: Array<Loadable>,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

// NOTE: Not used anywhere but this is what Pundle supports publically
export type PublicPundleConfig = {
  configFileName?: string,
  enableConfigFile: boolean,
}
