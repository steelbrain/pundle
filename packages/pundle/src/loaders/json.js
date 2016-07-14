/* @flow */

import type Pundle from '../'
import type { LoaderResult } from '../types'

export default function processJSON(pundle: Pundle, filePath: string, contents: string): LoaderResult {
  const toReturn = {}
  toReturn.imports = new Set()
  toReturn.sourceMap = {}
  toReturn.contents = contents
  return toReturn
}
