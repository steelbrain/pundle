// @flow

import { registerComponent } from 'pundle-api'
import parseError from 'pundle-reporter-base'

import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-reporter-console',
    version,
    hookName: 'report',
    callback(error) {
      const parsed = parseError(error)
      console.error(parsed)
    },
    defaultOptions: {},
  })
}
