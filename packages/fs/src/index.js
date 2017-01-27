/* @flow */

import { stat, readFile } from 'graceful-fs'

export default {
  stat(path: string): Promise<Object> {
    return new Promise(function(resolve, reject) {
      stat(path, function(error, stats) {
        if (error) {
          reject(error)
        } else {
          resolve(stats)
        }
      })
    })
  },
  readFile(path: string): Promise<string> {
    return new Promise(function(resolve, reject) {
      readFile(path, 'utf8', function(error, contents) {
        if (error) {
          reject(error)
        } else {
          // NOTE: Strip BOM
          if (contents.charCodeAt(0) === 0xFEFF) {
            contents = contents.slice(1)
          }
          resolve(contents)
        }
      })
    })
  },
}
