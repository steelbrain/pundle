// @flow

import path from 'path'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import { createFileTransformer, getChunk } from 'pundle-api'

import manifest from '../package.json'
import pluginImportResolver from './plugin-import-resolver'

function createComponent({ extensions = ['.css'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    priority: 1500,
    async callback({ file, resolve, addChunk }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) {
        return null
      }

      let moduleMap = null
      const plugins = []
      const fileIsModule = file.filePath.endsWith(`.module${extName}`)

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
          file,
          resolve,
          addChunk,
        }),
      )

      const cssChunk = getChunk('css', null, file.filePath)
      const processed = await postcss(plugins).process(
        typeof file.contents === 'string' ? file.contents : file.contents.toString(),
        {
          from: file.filePath,
          map: { inline: false, annotation: false },
        },
      )

      if (file.format === 'js') {
        // was imported from a JS file
        await addChunk(cssChunk)

        return {
          contents: moduleMap ? `module.exports = ${JSON.stringify(moduleMap)}` : '',
          sourceMap: false,
        }
      } else if (file.format === 'css') {
        // entry or was imported from a css file

        return {
          contents: processed.css,
          sourceMap: processed.map.toJSON(),
        }
      }
      throw new Error(`Unknown format for css files '${file.format}' encountered in loader-css`)
    },
  })
}

module.exports = createComponent
