// @flow

import { createReporter } from 'pundle-api'
import parseError from 'pundle-reporter-base'

import { version } from '../package.json'

export default function() {
  return createReporter({
    name: 'pundle-reporter-console',
    version,
    callback(context, options, error) {
      const parsed = parseError(error)
      console.error(parsed)
    },
    defaultOptions: {},
  })
}
