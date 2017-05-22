/* @flow */

import { createLoader, shouldProcess, MessageIssue } from 'pundle-api'
import type { Context, File } from 'pundle-api/types'

export default createLoader(async function(context: Context, config: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(file.contents)
  } catch (_) {
    throw new MessageIssue(`Malformed JSON found at '${file.filePath}'`, 'error')
  }

  return {
    chunks: [],
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
