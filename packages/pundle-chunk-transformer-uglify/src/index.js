// @flow

import path from 'path'
import mergeSourceMap from 'merge-source-map'
import { minify as processUglify } from 'uglify-es'
import { minify as processTerser } from 'terser'
import { createChunkTransformer } from '@pundle/api'

import manifest from '../package.json'

const VALID_UGLIFIERS = new Set(['uglify', 'terser'])
function createComponent({ options = {}, uglifier = 'uglify' }: { options?: Object, uglifier: 'terser' | 'uglify' } = {}) {
  if (!VALID_UGLIFIERS.has(uglifier)) {
    throw new Error(`options.uglifier must be either 'uglify' or 'terser'. Got: ${uglifier}`)
  }

  return createChunkTransformer({
    name: manifest.name,
    version: manifest.version,
    async callback({ filePath, format, contents, sourceMap }) {
      if (format !== 'js') return null

      const sourceMapOptions =
        filePath && sourceMap && sourceMap.filePath
          ? {
              url: path.posix.relative(path.dirname(filePath), sourceMap.filePath),
            }
          : null
      const uglify = uglifier === 'terser' ? processTerser : processUglify
      const { code, error, map } = uglify(typeof contents === 'string' ? contents : contents.toString(), {
        sourceMap: sourceMapOptions,
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
        sourceMap:
          sourceMap && map
            ? {
                contents: JSON.stringify(mergeSourceMap(sourceMap.contents, map)),
              }
            : null,
      }
    },
  })
}

module.exports = createComponent
