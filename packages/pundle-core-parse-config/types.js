// @flow

import type { Components, ComponentOptions, BaseConfig } from 'pundle-api'

export type AcceptedConfig = {
  entry?: Array<string> | string,
  rootDirectory: string,

  configFile?: boolean,
  configFileName?: string,
}
export type ParsedConfig = {
  config: BaseConfig,
  options: ComponentOptions,
  components: Components,
}
