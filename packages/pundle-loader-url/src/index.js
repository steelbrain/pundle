// @flow

import mimeTypes from 'mime-types'
import { extname } from 'path'
import { processRequest } from 'pundle-loader-file'
import { createLoader, shouldProcess, MessageIssue } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createLoader({
    name: 'pundle-loader-url',
    version,
    async callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      if (options.maxSize !== 'number') {
        throw new MessageIssue('options.maxSize must be specified to pundle-loader-url')
      }
      if (file.sourceContents.length > options.maxSize) {
        return processRequest(context, options, file)
      }
      const mimeType = mimeTypes.lookup(extname(file.fileName)) || 'application/octet-stream'
      const contents = `module.exports = ${JSON.stringify(
        `data:${mimeType};base64,${file.sourceContents.toString('base64')}`,
      )}`

      return {
        contents,
        sourceMap: null,
      }
    },
    defaultOptions: {
      // maxSize: 100 * 1024,
      // ^ max size to inline in bytes
      publicDirectory: '/',
    },
  })
}
