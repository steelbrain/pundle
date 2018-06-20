// @flow

import path from 'path'
import JSON5 from 'json5'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.json5'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-json5',
    version: manifest.version,
    priority: 1500,
    callback({ file }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName) || file.format !== 'js') {
        return null
      }
      // TODO: Error handling
      const parsed = JSON5.parse(file.contents.toString())

      return {
        contents: `module.exports = ${JSON.stringify(parsed)}`,
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