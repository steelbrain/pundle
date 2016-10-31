/* @flow */

import { createGenerator } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createGenerator(function(config: Object, files: Array<File>, runtimeConfig: Object) {
  Object.assign(config, runtimeConfig)
  return 'Wow Doge'
}, {
  filename: null,
  pathType: 'filePath',
  directory: null,
  sourceMap: false,
  sourceMapRoot: '$app',
})
