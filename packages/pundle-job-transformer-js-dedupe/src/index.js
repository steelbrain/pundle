// @flow

import { createJobTransformer } from 'pundle-api'
import { name, version } from '../package.json'

function createComponent() {
  return createJobTransformer({
    name,
    version,
    callback({ context, worker, job }) {
      console.log('dedupe transformer')
      return null
    },
  })
}

module.exports = createComponent
