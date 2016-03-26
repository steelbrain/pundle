'use strict'

/* @flow */

import FS from 'fs'
import promisify from 'sb-promisify'
import type { Pundle$Config } from './types'

const stat = promisify(FS.stat, false)
const readFile = promisify(FS.readFile)

export default class FileSystem {
  config: Pundle$Config;

  constructor(config: Pundle$Config) {
    this.config = config
  }
  async stat(path: string): Promise<?FS.Stats> {
    return await stat(path)
  }
  async readFile(path: string): Promise<string> {
    return (await readFile(path)).toString()
  }
}
