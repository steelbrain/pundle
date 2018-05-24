// @flow

import path from 'path'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import { createFileTransformer, getChunk } from 'pundle-api'

import manifest from '../package.json'
import pluginImportResolver from './plugin-import-resolver'

export default function({ extensions = ['.css'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    priority: 1001,
    // +1 from transformer-js
    async callback({ filePath, format, contents }, { resolve, addChunk, getFileName }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName)) {
        return null
      }

      let moduleMap = null
      const plugins = []
      const fileIsModule = filePath.endsWith('.module.css')

      if (fileIsModule) {
        plugins.push(
          postcssModules({
            scopeBehaviour: 'local',
            getJSON(_, map) {
              moduleMap = map
            },
          }),
        )
      }
      plugins.push(
        pluginImportResolver({
          resolve,
          addChunk,
        }),
      )

      const cssChunk = getChunk('css', null, filePath)
      const processed = await postcss(plugins).process(typeof contents === 'string' ? contents : contents.toString(), {
        from: filePath,
        map: { inline: false, annotation: false },
      })

      if (format === 'js') {
        // was imported from a JS file
        addChunk(cssChunk)

        return {
          contents: moduleMap ? `module.exports = ${JSON.stringify(moduleMap)}` : '',
          sourceMap: null,
        }
      } else if (format === 'css') {
        // entry or was imported from a css file
        let { css } = processed
        if (processed.map) {
          const sourceMapUrl = getFileName({ ...cssChunk, format: 'css.map' })
          if (sourceMapUrl) {
            css += `\n$/*# sourceMappingURL=${sourceMapUrl} */`
          }
        }

        return {
          contents: css,
          sourceMap: processed.map,
        }
      }
      throw new Error(`Unknown format for css files '${format}' encountered in loader-css`)
    },
  })
}
