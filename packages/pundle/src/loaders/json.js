/* @flow */

import type Pundle from '../'
import type { LoaderResult } from '../types'

export default function processJSON(pundle: Pundle, filePath: string, contents: string): LoaderResult {
  let parsed
  try {
    parsed = JSON.parse(contents)
  } catch (_) {
    throw new Error(`Malformed JSON found at '${filePath}'`)
  }
  return {
    imports: new Set(),
    sourceMap: {
      mappings: [],
      names: [],
      sources: [filePath],
      version: 3,
    },
    contents: `module.exports = ${JSON.stringify(parsed, null, 2)}`,
  }
}
