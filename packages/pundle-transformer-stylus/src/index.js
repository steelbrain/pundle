// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({
  extensions = ['.styl', '.stylus'],
  options = {},
}: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-stylus',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const exported = await loadLocalFromContext(context, 'stylus')
      const renderer = exported(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
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
