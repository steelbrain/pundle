// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.less'], options = {} }: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const exported = await loadLocalFromContext(context, 'less')
      const processed = await exported.render(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        filename: file.filePath,
        sourceMap: {},
        ...options,
      })

      return {
        contents: processed.css,
        sourceMap: JSON.parse(processed.map),
      }
    },
  })
}

module.exports = createComponent
