// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.less'], options = {} }: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-less',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const { name, exported } = loadLocalFromContext(context, ['less'])
      if (!name) {
        throw new Error(`'less' not found in '${context.config.rootDirectory}'`)
      }

      const processed = await exported.render(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        sourceMap: {},
        paths: [path.dirname(file.filePath)],
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
