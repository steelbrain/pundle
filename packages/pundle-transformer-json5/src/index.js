// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.json5'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-json5',
    version: manifest.version,
    priority: 1500,
    callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName) || file.format !== 'js') {
        return null
      }
      const { name, exported } = loadLocalFromContext(context, ['json5'])
      if (!name) {
        throw new Error(`'json5' not found in '${context.config.rootDirectory}'`)
      }
      // TODO: error handling
      const parsed = exported.parse(typeof file.contents === 'string' ? file.contents : file.contents.toString())

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
