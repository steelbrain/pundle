/* @flow */

import { version as apiVersion } from '../package.json'

export const version = apiVersion.split('.')[0]

const PATH_EXTRACTION_REGEXP = /(.*?): /
export function extractMessage(raw: string): string {
  const matches = PATH_EXTRACTION_REGEXP.exec(raw)
  if (matches) {
    return raw.slice(matches[0].length)
  }
  return raw
}
