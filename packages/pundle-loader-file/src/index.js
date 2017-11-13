// @flow

import { posix } from 'path'
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
      const contents = `module.exports = ${JSON.stringify(posix.resolve(options.contentPublicDirectory, file.fileName))}`
      file.sourceContents = file.contents
      return {
        contents,
        sourceMap: null,
      }
    },
    defaultOptions: {
      extensions: [],
      replaceVariables: {},
      contentPublicDirectory: '/',
    },
  })
}
