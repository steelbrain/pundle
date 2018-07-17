// @flow

import path from 'path'
import { serialize } from 'serialize-to-js'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ extensions = ['.yaml', '.yml'] }: { extensions?: Array<string> }) {
  return createFileTransformer({
    name: 'pundle-transformer-yaml',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const { name, exported } = loadLocalFromContext(context, ['js-yaml'])
      if (!name) {
        throw new Error(`'js-yaml' not found in '${context.config.rootDirectory}'`)
      }

      const parsed = exported.safeLoad(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        filename: file.filePath,
      })

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
