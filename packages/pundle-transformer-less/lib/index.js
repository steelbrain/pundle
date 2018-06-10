// @flow

import path from 'path'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getLess } from './helpers'

function createComponent({ extensions = ['.less'], options = {} }: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-less',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const less = getLess(context.config.rootDirectory)
      if (!less) {
        throw new Error(`'less' not found in '${context.config.rootDirectory}'`)
      }

      const processed = await less.render(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
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
