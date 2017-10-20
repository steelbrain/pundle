// @flow

import { registerComponent } from 'pundle-api'
import parseError from 'pundle-reporter-base'
import type { ComponentReporter } from 'pundle-api/lib/types'

import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-reporter-console',
    version,
    hookName: 'report',
    callback: (function(context, options, error) {
      const parsed = parseError(error)
      console.error(parsed)
    }: ComponentReporter),
    defaultOptions: {},
  })
}
