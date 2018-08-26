// @flow

import path from 'path'
import { serialize } from 'serialize-to-js'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.toml'] }: { extensions?: Array<string> }) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const exported = await loadLocalFromContext(context, 'toml')
      const parsed = exported.parse(typeof file.contents === 'string' ? file.contents : file.contents.toString())

      return {
        contents: `module.exports = ${serialize(parsed)}`,
        sourceMap: {
          version: 3,
          sources: [file.filePath],
          names: ['$'],
          mappings: 'AAAAA',
        },
      }
    },
  })
}

module.exports = createComponent
