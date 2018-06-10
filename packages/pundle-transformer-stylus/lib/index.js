// @flow

import path from 'path'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getStylus } from './helpers'

function createComponent({ extensions = ['.styl'], options = {} }: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-stylus',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const stylus = getStylus(context.config.rootDirectory)
      if (!stylus) {
        throw new Error(`'stylus' not found in '${context.config.rootDirectory}'`)
      }

      const renderer = stylus(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        sourcemap: true,
        filename: file.filePath,
        paths: [path.dirname(file.filePath)],
        ...options,
      })
      const processed = renderer.render()

      return {
        contents: processed,
        sourceMap: renderer.sourcemap,
      }
    },
  })
}

module.exports = createComponent
