/* @flow */

import { createPostTransformer, MessageIssue } from 'pundle-api'

export default createPostTransformer(async function(config: Object, contents: string) {
  let uglifyPath
  try {
    uglifyPath = await this.resolve('uglify-js')
  } catch (_) {
    throw new MessageIssue('Unable to find uglify-js in project root', 'error')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const uglify = require(uglifyPath)

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
