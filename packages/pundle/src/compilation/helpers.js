'use strict'

/* @flow */

import isRegexp from 'lodash.isregexp'
import type { WatcherConfig, ArrayDifference } from '../types'

export function normalizeWatcherConfig(givenOptions: Object): WatcherConfig {
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

export function arrayDifference<T>(oldArray: Array<T>, newArray: Array<T>): ArrayDifference<T> {
  const added = []
  const removed = []

  for (const entry of oldArray) {
    if (newArray.indexOf(entry) === -1) {
      removed.push(entry)
    }
  }
  for (const entry of newArray) {
    if (oldArray.indexOf(entry) === -1) {
      added.push(entry)
    }
  }

  return { added, removed }
}
