// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from '@pundle/api'

import manifest from '../package.json'

function createComponent({ plugins = [], extensions = ['.css'] }: { plugins?: Array<any>, extensions: Array<string> } = {}) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const exported = await loadLocalFromContext(context, 'postcss')
      const processed = await exported(plugins).process(
        typeof file.contents === 'string' ? file.contents : file.contents.toString(),
        {
          from: file.filePath,
          map: { from: file.filePath, inline: false, annotation: false },
        },
      )

      return {
        contents: processed.css,
        sourceMap: processed.map.toJSON(),
      }
    },
  })
}

module.exports = createComponent
