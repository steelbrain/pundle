/* @flow */

import fileSystem from 'sb-fs'
import { createLoader, shouldProcess } from 'pundle-api'
import type { Context, File } from 'pundle-api/types'

export default createLoader(async function(context: Context, config: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }
  const contents = await fileSystem.readFile(file.filePath)

  return {
    chunks: [],
    imports: [],
    sourceMap: {
      version: 3,
      sources: [file.filePath],
      names: ['$'],
      mappings: 'AAAAA',
    },
    contents: `module.exports = ${JSON.stringify(`data:application/octet-stream;base64,${contents.toString('base64')}`)}`,
  }
}, {
  extensions: null,
})
