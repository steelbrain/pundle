'use strict'

/* @flow */

import type { Pundle$Watcher$Options$User } from '../../pundle/src/types'
import type { Middleware$Options } from '../../middleware/src/types'
import type { Pundle$Config } from '../../pundle/src/types'

export type Express$Server = {
  close: (() => any)
}

export type Server$Config = {
  server: {
    port: number
  },
  pundle: Pundle$Config,
  watcher: Pundle$Watcher$Options$User,
  middleware: Middleware$Options
}
