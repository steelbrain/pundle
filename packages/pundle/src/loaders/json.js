/* @flow */

import type { Config, LoaderResult } from '../types'

export default function processJSON(config: Config, filePath: string, contents: string): LoaderResult {
  const toReturn = {}
  toReturn.imports = new Set()
  toReturn.sourceMap = {}
  toReturn.contents = contents
  return toReturn
}