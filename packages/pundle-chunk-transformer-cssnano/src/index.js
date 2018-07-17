// @flow

import path from 'path'
import cssnano from 'cssnano'
import postcss from 'postcss'
import mergeSourceMap from 'merge-source-map'
import { createChunkTransformer } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ options = {} }: { options?: Object } = {}) {
  return createChunkTransformer({
    name: 'pundle-chunk-transformer-cssnano',
    version: manifest.version,
    async callback({ filePath, format, contents, sourceMap }) {
      if (format !== 'css') return null

      const processed = await postcss([
        cssnano({
          preset: 'default',
          ...options,
        }),
      ]).process(typeof contents === 'string' ? contents : contents.toString(), {
        from: filePath,
        map: sourceMap && sourceMap.filePath ? { inline: false, annotation: false } : null,
      })
      let { css } = processed
      if (sourceMap && sourceMap.filePath) {
        const relativeUrl = path.posix.relative(path.dirname(filePath), sourceMap.filePath)
        css += `/*# sourceMappingURL=${relativeUrl} */`
      }

      return {
        contents: css,
        sourceMap: processed.map
          ? {
              contents: JSON.stringify(mergeSourceMap(sourceMap.contents, processed.map.toJSON())),
            }
          : null,
      }
    },
  })
}

module.exports = createComponent
