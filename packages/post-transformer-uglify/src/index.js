/* @flow */

import { createPostTransformer } from 'pundle-api'

export default createPostTransformer(async function(config: Object, contents: string) {
  let uglifyPath
  try {
    uglifyPath = await this.resolve('uglify-js')
  } catch (_) {
    throw new Error('Unable to find uglify-js installed locally in the project')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const uglify = require(uglifyPath) // eslint-disable-line global-require

  const processed = uglify.minify(contents, Object.assign({}, config.config, {
    fromString: true,
  }))

  return {
    contents: processed.code,
    sourceMap: processed.map,
  }
}, {
  config: {},
})
