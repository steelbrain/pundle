// @flow

import path from 'path'
import { createFileTransformer, loadLocalFromContext } from '@pundle/api'

import manifest from '../package.json'

function createComponent({ extensions = ['.gql', '.graphql'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 1500,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName) || file.format !== 'js') {
        return null
      }
      const exported = await loadLocalFromContext(context, 'graphql-tag')
      const parsed = exported(typeof file.contents === 'string' ? file.contents : file.contents.toString())

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
