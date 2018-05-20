// @flow

import path from 'path'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.css'] }: { extensions?: Array<string> } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    priority: 1001,
    // +1 from transformer-js
    async callback({ filePath, format, contents }, { resolve, addImport, addChunk }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName)) {
        return null
      }

      const stringContents = typeof contents === 'string' ? contents : contents.toString()
      console.log('stringContents', stringContents)

      return null
    },
  })
}
