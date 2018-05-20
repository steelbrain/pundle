// @flow

import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

export default function() {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    async callback({ filePath, format, contents, isBuffer }, { resolve, addImport, addChunk }) {
      if (format !== 'css') return null

      const stringContents = isBuffer ? contents.toString() : contents
      console.log('stringContents', stringContents)

      return null
    },
  })
}
