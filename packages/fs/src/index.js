'use strict'

/* @flow */

import FS from 'fs'
import resolve from 'resolve'
import promisify from 'sb-promisify'
import type { Pundle$Config } from '../../pundle/src/types'

const promisedFS = promisify.promisifyAll(require('fs'))
const promisedResolve = promisify(resolve)

class FileSystem {
  config: Pundle$Config;

  constructor(config: Pundle$Config) {
    this.config = config
  }
  stat(path: string): Promise<FS.Stats> {
    return promisedFS.stat(path)
  }
  statSync(path: string): FS.Stats {
    return FS.statSync(path)
  }
  resolve(moduleName: string, basedir: string): Promise<string> {
    return promisedResolve(moduleName, { basedir })
  }
  resolveSync(moduleName: string, basedir: string): string {
    return resolve.sync(moduleName, { basedir })
  }
  async readFile(filePath: string): Promise<string> {
    return (await promisedFS.readFile(filePath)).toString('utf8')
  }
  readFileSync(filePath: string): string {
    return FS.readFileSync(filePath).toString('utf8')
  }
}

module.exports = FileSystem
