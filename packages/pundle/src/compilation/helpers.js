'use strict'

/* @flow */

import isRegexp from 'lodash.isregexp'
import type { Pundle$Watcher$Options } from '../types'

export function normalizeWatcherOptions(givenOptions: Object): Pundle$Watcher$Options {
  const options = Object.assign({}, givenOptions)
  if (typeof options.ignored !== 'string' && !isRegexp(options.ignored) && !Array.isArray(options.ignored)) {
    options.ignored = /(node_modules|bower_components)/
  }
  if (typeof options.onError !== 'function') {
    throw new Error('options.onError must be a function')
  }
  options.ignored = [/[\/\\]\./].concat(options.ignored)
  return options
}
