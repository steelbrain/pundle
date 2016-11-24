/* @flow */

import Path from 'path'
import invariant from 'assert'
import { createLoader, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }
  const publicPath = config.publicPath || this.config.publicPath
  invariant(publicPath && typeof publicPath === 'string', 'publicPath must be a string')
  const publicFilePath = Path.join(publicPath, Path.relative(this.config.rootDirectory, file.filePath))

  return {
    imports: new Set(),
    sourceMap: {
      version: 3,
      sources: [file.filePath],
      names: ['$'],
      mappings: 'AAAAA',
    },
    contents: `module.exports = ${JSON.stringify(publicFilePath)}`,
  }
}, {
  extensions: null,
  // ^ Default is null, but consumers MUST provide some extensions
  // Not providing them is considered error
  publicPath: null,
  // ^ By default (or when null is provided), config.publicPath is used
})
