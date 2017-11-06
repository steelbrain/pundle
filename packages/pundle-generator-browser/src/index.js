// @flow

import { createGenerator } from 'pundle-api'
import { version } from '../package.json'

export default function() {
  return createGenerator({
    name: 'pundle-generator-browser',
    version,
    async callback() {
      /* No Op */
    },
    defaultOptions: {},
  })
}
