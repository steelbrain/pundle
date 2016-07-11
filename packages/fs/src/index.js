'use strict'

/* @flow */

import promisify from 'sb-promisify'
import type FS from 'fs'

const promisedFS = promisify.promisifyAll(require('fs'))

module.exports = {
  stat(path: string): Promise<FS.Stats> {
    return promisedFS.stat(path)
  },
  readFile(filePath: string): Promise<string> {
    return promisedFS.readFile(filePath, 'utf8')
  }
}
