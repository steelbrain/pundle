// @flow

import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getPostcss } from './helpers'

function createComponent({ plugins = [] }: { plugins?: Array<any> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-postcss',
    version: manifest.version,
    priority: 1250,
    async callback({ file, context }) {
      if (file.format !== 'css') return null

      const postcss = getPostcss(context.config.rootDirectory)
      if (!postcss) {
        throw new Error(`'postcss' not found in '${context.config.rootDirectory}'`)
      }

      const processed = await postcss(plugins).process(
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
