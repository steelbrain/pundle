// @flow

import { posix, extname } from 'path'
import { createLoader, shouldProcess } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createLoader({
    name: 'file',
    version,
    async callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      const ext = extname(file.filePath)
      const chunk = context.getFileChunk(file.fileName)
      const contents = `module.exports = ${JSON.stringify(`${posix.resolve(options.publicDirectory, chunk.label)}${ext}`)}`

      file.addChunk(chunk)

      return {
        contents,
        sourceMap: null,
      }
    },
    defaultOptions: {
      extensions: [],
      replaceVariables: {},
      publicDirectory: '/',
    },
  })
}
