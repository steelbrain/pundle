/* @flow */

import { createLoader, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(function(file: File, config: Object, pundle: Object) {
  if (!shouldProcess(pundle.config.rootDirectory, file.filePath, config)) {
    return null
  }

  const imports = new Set()
  const contents = file.contents
  const sourceMap = file.sourceMap

  return { imports, contents, sourceMap }
}, {
  include: ['*.js'],
})
