// @flow

import uglifyES from 'uglify-es'
import { createPostGenerator, MessageIssue } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createPostGenerator({
    name: 'pundle-post-generator-uglify',
    version,
    async callback(context, options, { contents, sourceMap }) {
      const minified = uglifyES.minify(contents, {
        sourceMap: {
          content: sourceMap,
        },
        ...options.config,
      })
      if (minified.error) {
        throw new MessageIssue(`${minified.error.message} (uglify)`)
      }

      return {
        contents: minified.code,
        sourceMap: minified.map,
      }
    },
    defaultOptions: {
      config: {},
    },
  })
}
