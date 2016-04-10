'use strict'

/* @flow */

import isRegexp from 'lodash.isregexp'
import type { WatcherOptions } from '../types'

export function normalizeWatcherOptions(givenOptions: Object): WatcherOptions {
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
