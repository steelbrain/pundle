// @flow

import type { Components, ComponentOptions } from 'pundle-api'
import type { BaseConfig } from 'pundle-api/types'

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
