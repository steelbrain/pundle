/* @flow */

import FS from 'fs'

export default {
  stat(path: string): Promise<FS.Stats> {
    return new Promise(function(resolve, reject) {
      FS.stat(path, function(error, stats) {
        if (error) {
          reject(error)
        } else {
          resolve(stats)
        }
      })
    })
  },
  readFile(filePath: string): Promise<string> {
    return new Promise(function(resolve, reject) {
      FS.readFile(filePath, 'utf8', function(error, stats) {
        if (error) {
          reject(error)
        } else {
          resolve(stats)
        }
      })
    })
  }
}
