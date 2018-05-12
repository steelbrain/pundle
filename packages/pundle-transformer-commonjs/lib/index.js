// @flow

import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'

// TODO: have a config?
export default function() {
  return createFileTransformer({
    name: 'pundle-transformer-commonjs',
    version: manifest.version,
    async callback({ filePath, format, contents, isBuffer, sourceMap }) {
      // Only ever process JS files
      if (format !== 'js') return null

      console.log('filePath', filePath, 'contents', contents, 'isBuffer', isBuffer, 'sourceMap', sourceMap)

      return null
    },
  })
}
