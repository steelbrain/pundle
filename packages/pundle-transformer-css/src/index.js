// @flow

import path from 'path'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import { createFileTransformer, getChunk } from 'pundle-api'

import manifest from '../package.json'
import pluginImportResolver from './plugin-import-resolver'
import { getDevelopmentContents } from './helpers'

function createComponent({
  extensions = ['.css'],
  development = process.env.NODE_ENV !== 'production',
}: { extensions?: Array<string>, development?: boolean } = {}) {
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

      const inlineMap = development && file.format === 'js'
      const cssChunk = getChunk('css', null, file.filePath)
      // TODO: Fix source map paths
      const processed = await postcss(plugins).process(
        typeof file.contents === 'string' ? file.contents : file.contents.toString(),
        {
          from: file.filePath,
          map: { inline: inlineMap, annotation: false },
        },
      )

      if (file.format === 'js') {
        const moduleMapContents = moduleMap ? `module.exports = ${JSON.stringify(moduleMap)}\n` : ''

        if (development) {
          return {
            contents: `${getDevelopmentContents(processed.css)}\n${moduleMapContents}`,
            sourceMap: false,
          }
        }

        // was imported from a JS file
        await addChunk(cssChunk)

        return {
          contents: moduleMapContents,
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
