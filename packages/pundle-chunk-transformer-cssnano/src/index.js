// @flow

import path from 'path'
import cssnano from 'cssnano'
import postcss from 'postcss'
import { createChunkTransformer } from '@pundle/api'

import manifest from '../package.json'

function createComponent({ options = {} }: { options?: Object } = {}) {
  return createChunkTransformer({
    name: manifest.name,
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
        map:
          filePath && sourceMap && sourceMap.filePath
            ? { inline: false, annotation: false, prev: sourceMap.contents, from: filePath }
            : null,
      })
      let { css, map } = processed
      if (filePath && sourceMap && sourceMap.filePath) {
        const relativeUrl = path.posix.relative(path.dirname(filePath), sourceMap.filePath)
        css += `/*# sourceMappingURL=${relativeUrl} */`
        map = JSON.stringify(map)
      } else map = null

      return {
        contents: css,
        sourceMap: map
          ? {
              contents: map,
            }
          : null,
      }
    },
  })
}

module.exports = createComponent
