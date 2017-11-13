// @flow

import { posix } from 'path'
import { createLoader, shouldProcess, type Context, type File } from 'pundle-api'

import { version } from '../package.json'

export function processRequest(context: Context, options: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
    return null
  }
  const chunk = context.getFileChunk(file.fileName)
  const contents = `module.exports = ${JSON.stringify(
    `${posix.resolve(options.publicDirectory, chunk.label)}${chunk.format}`,
  )}`

  file.addChunk(chunk)

  return {
    contents,
    sourceMap: null,
  }
}

export default function() {
  return createLoader({
    name: 'pundle-loader-file',
    version,
    callback: processRequest,
    defaultOptions: {
      publicDirectory: '/',
    },
  })
}
