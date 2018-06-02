// @flow

import path from 'path'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.json'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-json',
    version: manifest.version,
    priority: 1500,
    callback({ file }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName) || file.format !== 'js') {
        return null
      }
      let parsed
      try {
        parsed = JSON.parse(file.contents.toString())
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Error parsing JSON at '${file.filePath}'`)
        }
        throw error
      }
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
