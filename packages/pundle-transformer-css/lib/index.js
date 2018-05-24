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

        // Add imports
        const promises = []

        const { nodes } = processed.root

        let i = nodes.length
        while (i--) {
          const node = nodes[i]
          const currentIndex = i
          if (node.type !== 'atrule' || node.name !== 'import') continue

          if (!node.params.startsWith('"') || !node.params.endsWith('"')) continue

          let request = node.params.slice(1, -1)

          if (request.slice(0, 1) !== '.') {
            request = `./${request}`
          }

          promises.push(
            resolve(request, node.source.start).then(resolved => {
              const importChunk = getChunk(resolved.format, null, resolved.filePath)
              addChunk(importChunk)
              nodes.splice(currentIndex, 1)
            }),
          )
        }

        await Promise.all(promises)

        return {
          contents: css,
          sourceMap: processed.map,
        }
      }
      throw new Error(`Unknown format for css files '${format}' encountered in loader-css`)
    },
  })
}
