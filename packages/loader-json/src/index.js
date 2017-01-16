/* @flow */

import { createLoader, shouldProcess, MessageIssue } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createLoader(function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(file.contents)
  } catch (_) {
    throw new MessageIssue(`Malformed JSON found at '${file.filePath}'`, 'error')
  }

  return {
    imports: [],
    sourceMap: {
      version: 3,
      sources: [file.filePath],
      names: ['$'],
      mappings: 'AAAAA',
    },
    contents: `module.exports = ${JSON.stringify(parsed)}`,
  }
}, {
  extensions: ['json'],
})
