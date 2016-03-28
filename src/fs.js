'use strict'

/* @flow */

import FS from 'fs'
import { isCore } from 'resolve'
import memoize from 'sb-memoize'
import promisify from 'sb-promisify'
import type { Pundle$Config } from './types'

const stat = promisify(FS.stat, false)
const readFile = promisify(FS.readFile)
const resolve = promisify(require('resolve'), false)

export default class FileSystem {
  config: Pundle$Config;
  resolve: ((moduleName: string, basedir: string) => Promise<string>);

  constructor(config: Pundle$Config) {
    this.config = config
    this.resolve = memoize(this._resolve, { async: true })
  }
  async stat(path: string): Promise<?FS.Stats> {
    return await stat(path)
  }
  async readFile(path: string): Promise<string> {
    return (await readFile(path)).toString()
  }
  async _resolve(moduleName: string, basedir: string): Promise<string> {
    if (isCore(moduleName)) {
      throw new Error('is core')
    }
    const path = await resolve(moduleName, { basedir })
    if (path) {
      return path
    }
    throw new Error('NPM install the module here for ' + moduleName + ' in ' + basedir)
  }
  getResolvedPath(moduleName: string, basedir: string): ?string {
    return this.resolve.__sb_cache[JSON.stringify([moduleName, basedir])]
  }
  clearCache() {
    this.resolve.__sb_cache = {}
  }
}
