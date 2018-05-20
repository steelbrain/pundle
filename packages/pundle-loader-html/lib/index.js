// @flow

import path from 'path'
import { createFileLoader } from 'pundle-api'

import manifest from '../package.json'

export default function({ extensions = ['.html'] }: { extensions?: Array<string> } = {}) {
  return createFileLoader({
    name: 'pundle-loader-html',
    version: manifest.version,
    callback({ contents, filePath, format }) {
      const extName = path.extname(filePath)
      if (!extensions.includes(extName) || format !== 'html') {
        return null
      }
      return {
        contents: contents.toString(),
        isBuffer: false,
        sourceMap: null,
      }
    },
  })
}
