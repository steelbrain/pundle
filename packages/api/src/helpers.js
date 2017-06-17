/* @flow */

import { version as apiVersion } from '../package.json'

export const version = apiVersion.split('.')[0]

export function makePromisedLock(callback: Function, keyCallback: Function): Function {
  const progressMap: Map<string, boolean> = new Map()
  return function(...parameters: Array<any>) {
    const progressKey = keyCallback(...parameters)
    const progressStatus = Boolean(progressMap.get(progressKey))
    if (progressStatus) {
      return Promise.resolve(null)
    }
    progressMap.set(progressKey, true)
    return callback.apply(this, parameters).then(function(result) {
      progressMap.delete(progressKey)
      return result
    }, function(error) {
      progressMap.delete(progressKey)
      throw error
    })
  }
}

const PATH_EXTRACTION_REGEXP = /(.*?): /
export function extractMessage(raw: string): string {
  const matches = PATH_EXTRACTION_REGEXP.exec(raw)
  if (matches) {
    return raw.slice(matches[0].length)
  }
  return raw
}
