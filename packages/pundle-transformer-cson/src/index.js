// @flow

import path from 'path'
import CSON from 'cson-parser'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.cson'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-cson',
    version: manifest.version,
    priority: 1500,
    callback({ file }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName) || file.format !== 'js') {
        return null
      }
      // TODO: error handling
      const parsed = CSON.parse(file.contents.toString())

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
