/* @flow */

import { version as apiVersion } from '../package.json'

export const version = apiVersion.split('.')[0]

export function makePromisedLock(callback: Function): Function {
  let inProgress = false
  return function(...parameters: Array<any>) {
    if (inProgress) {
      return Promise.resolve(null)
    }
    inProgress = true
    return callback.apply(this, parameters).then(function(result) {
      inProgress = false
      return result
    }, function(error) {
      inProgress = false
      throw error
    })
  }
}
