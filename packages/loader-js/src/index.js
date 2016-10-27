/* @flow */

import { createLoader, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  const imports = new Set()
  const contents = file.contents
  const sourceMap = file.sourceMap

  return { imports, contents, sourceMap }
}, {
  include: ['*.js'],
})
