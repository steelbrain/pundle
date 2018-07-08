// @flow

import { minify as processUglify } from 'uglify-es'
import { minify as processTerser } from 'terser'
import { createChunkTransformer } from 'pundle-api'

import manifest from '../package.json'

// TODO: Fix source maps
const VALID_UGLIFIERS = new Set(['uglify', 'terser'])
function createComponent({ options = {}, uglifier = 'uglify' }: { options?: Object, uglifier: 'terser' | 'uglify' } = {}) {
  if (!VALID_UGLIFIERS.has(uglifier)) {
    throw new Error(`options.uglifier must be either 'uglify' or 'terser'. Got: ${uglifier}`)
  }

  return createChunkTransformer({
    name: 'pundle-chunk-transformer-js-uglify',
    version: manifest.version,
    async callback({ format, contents }) {
      if (format !== 'js') return null

      const uglify = uglifier === 'terser' ? processTerser : processUglify
      const { code, error } = uglify(typeof contents === 'string' ? contents : contents.toString(), {
        ...options,
          compress: {
            defaults: false,
            ...options.compress,
          },
      })
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
