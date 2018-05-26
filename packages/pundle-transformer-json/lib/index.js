// @flow

import path from 'path'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.json'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-json',
    version: manifest.version,
    priority: 1500,
    // +1 from transformer-js
    callback({ contents, filePath, format }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName) || format !== 'js') {
        return null
      }
      let parsed
      try {
        parsed = JSON.parse(contents.toString())
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Error parsing JSON at '${filePath}'`)
        }
        throw error
      }
      return {
        contents: `module.exports = ${JSON.stringify(parsed)}`,
        sourceMap: null,
      }
    },
  })
}
