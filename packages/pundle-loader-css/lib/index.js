// @flow

import path from 'path'
import { createFileLoader } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.css'] }: { extensions?: Array<string> } = {}) {
  return createFileLoader({
    name: 'pundle-loader-css',
    version: manifest.version,
    callback({ contents, filePath }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName)) {
        return null
      }
      return {
        contents: contents.toString(),
        sourceMap: null,
      }
    },
  })
}
