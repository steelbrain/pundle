'use strict'

/* @flow */

import Path from 'path'
import FS from 'fs'
import { isCore, sync as resolveSync } from 'resolve'
import memoize from 'sb-memoize'
import promisify from 'sb-promisify'
import type { Pundle$Config } from './types'

const stat = promisify(FS.stat, false)
const readFile = promisify(FS.readFile)
const resolve = promisify(require('resolve'), false)

export default class FileSystem {
  config: Pundle$Config;
  resolve: ((moduleName: string, basedir: string) => Promise<string>);
  resolveSync: ((moduleName: string, basedir: string) => string);

  constructor(config: Pundle$Config) {
    this.config = config
    this.resolve = memoize(this._resolve, { async: true })
    this.resolveSync = memoize(this._resolveSync)

    // NOTE: Share the cache between the two
    this.resolveSync.__sb_cache = this.resolve.__sb_cache
  }
  async stat(path: string): Promise<?FS.Stats> {
    if (!Path.isAbsolute(path)) {
      path = Path.join(this.config.rootDirectory, path)
    }
    return await stat(path)
  }
  async readFile(path: string): Promise<string> {
    if (!Path.isAbsolute(path)) {
      path = Path.join(this.config.rootDirectory, path)
    }
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
  _resolveSync(moduleName: string, basedir: string): string {
    if (isCore(moduleName)) {
      throw new Error('is core')
    }
    try {
      return resolveSync(moduleName, { basedir })
    } catch (_) {
      throw new Error('NPM install the module here for ' + moduleName + ' in ' + basedir)
    }
  }
  getResolvedPath(moduleName: string, basedir: string): ?string {
    return this.resolve.__sb_cache[JSON.stringify([moduleName, basedir])]
  }
  clearCache() {
    this.resolve.__sb_cache = {}
  }
}
