'use strict'

/* @flow */

import type { WatcherConfig } from '../../pundle/src/types'
import type { Middleware$Options } from '../../middleware/src/types'
import type { Config } from '../../pundle/src/types'

export type Express$Server = {
  close: (() => any)
}

export type Server$Config = {
  server: {
    port: number
  },
  pundle: Config,
  watcher: WatcherConfig,
  middleware: Middleware$Options
}
