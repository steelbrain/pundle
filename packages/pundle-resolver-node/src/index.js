// @flow

import { registerComponent } from 'pundle-api'
import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-resolver-node',
    version,
    hookName: 'resolve',
    callback(context, options, request) {
      console.log('request', request)
    },
    defaultOptions: {
      extensions: ['', '.js', '.json'],
    },
  })
}
