/* @flow */

import { createLoader, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(function(file: File, config: Object, pundle: Object) {
  if (!shouldProcess(pundle.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(file.contents)
  } catch (_) {
    throw new Error(`Malformed JSON found at '${file.filePath}'`)
  }
  return {
    imports: new Set(),
    sourceMap: {
      mappings: [],
      names: [],
      sources: [file.publicPath],
      version: 3,
    },
    contents: `module.exports = ${JSON.stringify(parsed, null, 2)}\n`,
  }
}, {
  include: ['*.json'],
})
