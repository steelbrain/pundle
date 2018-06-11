// @flow

import minify from 'babel-minify'
import { createChunkTransformer } from 'pundle-api'

import manifest from '../package.json'

// TODO: Fix source maps
function createComponent() {
  return createChunkTransformer({
    name: 'pundle-chunk-transformer-js',
    version: manifest.version,
    async callback({ format, contents }) {
      if (format !== 'js') return null

      const { code } = minify(typeof contents === 'string' ? contents : contents.toString(), {
        mangle: {
          keepClassName: true,
        },
      })

      return {
        contents: code,
        sourceMap: null,
      }
    },
  })
}

module.exports = createComponent
