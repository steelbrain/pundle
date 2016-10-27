/* @flow */

import { createTransformer, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createTransformer(async function(file: File, config: Object, pundle: Object) {
  if (!shouldProcess(pundle.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let uglifyPath
  try {
    uglifyPath = await this.resolve('uglify-js')
  } catch (_) {
    throw new Error('Unable to find uglify-js installed locally in the project')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const uglify = require(uglifyPath) // eslint-disable-line global-require

  const processed = uglify.minify(file.contents, Object.assign({}, config.config, {
    fromString: true,
    outSourceMap: 'unicorns',
  }))

  return {
    contents: processed.code,
    sourceMap: processed.map,
  }
}, {
  config: {},
  include: ['*.js'],
  exclude: [],
})
