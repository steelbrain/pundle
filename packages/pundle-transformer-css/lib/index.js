// @flow

import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

export default function() {
  return createFileTransformer({
    name: 'pundle-transformer-css',
    version: manifest.version,
    async callback({ filePath, format, contents }, { resolve, addImport, addChunk }) {
      if (format !== 'css') return null

      const stringContents = typeof contents === 'string' ? contents : contents.toString()
      console.log('stringContents', stringContents)

      return null
    },
  })
}
