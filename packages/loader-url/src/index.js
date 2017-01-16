/* @flow */

import FS from 'sb-fs'
import { createLoader, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(async function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }
  const contents = await FS.readFile(file.filePath)

  return {
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
