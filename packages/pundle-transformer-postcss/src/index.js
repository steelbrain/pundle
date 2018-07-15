// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ plugins = [], extensions = ['.css'] }: { plugins?: Array<any>, extensions: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-postcss',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const { name, exported } = loadLocalFromContext(context, ['postcss'])
      if (!name) {
        throw new Error(`'postcss' not found in '${context.config.rootDirectory}'`)
      }

      const processed = await exported(plugins).process(
        typeof file.contents === 'string' ? file.contents : file.contents.toString(),
        {
          from: file.filePath,
          map: { inline: false, annotation: false },
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
