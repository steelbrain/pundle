// @flow

import path from 'path'
import { createFileLoader } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.js', '.mjs'] }: { extensions?: Array<string> } = {}) {
  return createFileLoader({
    name: 'pundle-loader-js',
    version: manifest.version,
    callback({ contents, filePath, format }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName) || format !== 'js') {
        return null
      }
      return {
        contents: contents.toString(),
        sourceMap: null,
      }
    },
  })
}
