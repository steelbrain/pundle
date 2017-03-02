/* @flow */

import invariant from 'assert'
import type { WatcherConfig } from '../../types'

// TODO: Do this in pundle root
// Notes:
// - If usePolling on config object doesn't exist, check env for existance
export function fillWatcherConfig(config: Object): WatcherConfig {
  const toReturn = {}

  invariant(typeof config === 'object' && config, 'Watcher config must be an object')
  toReturn.usePolling = typeof config.usePolling === 'undefined'
    ? {}.hasOwnProperty.call(process.env, 'PUNDLE_WATCHER_USE_POLLING')
    : !! config.usePolling

  return toReturn
}
