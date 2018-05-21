// @flow

import path from 'path'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import { createFileTransformer, getChunk } from 'pundle-api'

import manifest from '../package.json'

// TODO: Process imports in JS files
export default function({ extensions = ['.css'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    priority: 1001,
    // +1 from transformer-js
    async callback({ filePath, format, contents }, { addChunk }) {
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

      const processed = await postcss(plugins).process(typeof contents === 'string' ? contents : contents.toString(), {
        from: filePath,
        map: { inline: false },
      })

      if (format === 'js') {
        // was imported from a JS file
        addChunk(getChunk('css', null, filePath))

        return {
          contents: moduleMap ? `module.exports = ${JSON.stringify(moduleMap)}` : '',
          sourceMap: null,
        }
      } else if (format === 'css') {
        // entry or was imported from a css file
        return {
          contents: processed.css,
          sourceMap: processed.map,
        }
      }
      throw new Error(`Unknown format for css files '${format}' encountered in loader-css`)
    },
  })
}
