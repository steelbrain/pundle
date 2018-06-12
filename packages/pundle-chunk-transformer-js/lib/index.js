// @flow

import { minify } from 'uglify-es'
import { createChunkTransformer } from 'pundle-api'

import manifest from '../package.json'

// TODO: Fix source maps
function createComponent() {
  return createChunkTransformer({
    name: 'pundle-chunk-transformer-js',
    version: manifest.version,
    async callback({ format, contents }) {
      if (format !== 'js') return null

      const { code, error } = minify(typeof contents === 'string' ? contents : contents.toString())
      if (error) {
        throw new Error(error)
      }

      return {
        contents: code,
        sourceMap: null,
      }
    },
  })
}

module.exports = createComponent
