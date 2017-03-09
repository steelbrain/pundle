/* @flow */

import type { PundleConfig, ComponentAny } from 'pundle-api/types'

export type ComponentEntry = {
  config: Object,
  component: ComponentAny,
}

// NOTE: This is what pundle accepts and can work with in Pundle.get()
export type PublicPundleConfig = PundleConfig & {
  configFileName?: string,
  enableConfigFile: boolean,
}
