'use strict'

/* @flow */

import promisify from 'sb-promisify'
import type FS from 'fs'

const promisedFS = promisify.promisifyAll(require('fs'))

class FileSystem {
  stat(path: string): Promise<FS.Stats> {
    return promisedFS.stat(path)
  }
  async readFile(filePath: string): Promise<string> {
    return (await promisedFS.readFile(filePath)).toString('utf8')
  }
}

module.exports = FileSystem
