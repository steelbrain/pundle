'use strict'

/* @flow */

import FS from 'fs'
import Path from 'path'
import memoize from 'sb-memoize'
import resolve from 'sb-resolve'
import builtins from './builtins'
import { find } from './helpers'
import type { Stats } from 'fs'
import type { FileSystemInterface, Config } from './types'

const wrapperContent = FS.readFileSync(Path.join(__dirname, '..', 'browser', 'wrapper.js'), 'utf8')
const hmrContent = FS.readFileSync(Path.join(__dirname, '..', 'browser', 'hmr.js'), 'utf8')

export default class FileSystem {
  config: Config;
  source: FileSystemInterface;
  readFileCache: Map<string, { stats: Stats, contents: string }>;
  cachedResolve: ((moduleName: string, basedir: string) => Promise<string>);

  constructor(config: Config, source: FileSystemInterface) {
    this.config = config
    this.source = source
    this.readFileCache = new Map()
    this.cachedResolve = memoize(function(moduleName: string, basedir: string) {
      return this.resolveUncached(moduleName, basedir)
    }, { async: true })
  }
  stat(path: string): Promise<Stats> {
    return this.source.stat(path)
  }
  async resolve(moduleName: string, basedir: string, cached: boolean = true): Promise<string> {
    if (moduleName === '$root') {
      return moduleName
    }

    const cacheKey = JSON.stringify([moduleName, basedir])
    let value
    if (cached) {
      value = await this.cachedResolve(moduleName, basedir)
    } else {
      value = await this.resolveUncached(moduleName, basedir)
    }
    this.cachedResolve.__sb_cache[cacheKey] = value
    return value
  }
  async resolveUncached(moduleName: string, basedir: string): Promise<string> {
    const config = Object.assign({}, this.config.resolve, {
      fs: {
        stat: this.stat.bind(this),
        readFile: this.readFile.bind(this)
      }
    })
    const parents = (await find(basedir, config.moduleDirectories || ['node_modules'], this.source)).map(Path.dirname)
    if (Array.isArray(config.root)) {
      config.root = config.root.concat(parents)
    } else if (typeof config.root === 'string') {
      config.root = [config.root].concat(parents)
    } else {
      config.root = parents
    }
    return await resolve(moduleName, basedir, config)
  }
  async readFile(filePath: string, useCached: boolean = true): Promise<string> {
    if (filePath === '$root') {
      return this.config.hmr ? hmrContent : wrapperContent
    }

    if (filePath.substr(0, 6) === '$core/') {
      filePath = builtins[filePath.substr(6)]
    }

    const cached = this.readFileCache.get(filePath)
    const newStats = await this.stat(filePath)
    if (cached && useCached && cached.stats.mtime.getTime() === newStats.mtime.getTime()) {
      return cached.contents
    }
    const contents = await this.source.readFile(filePath)
    this.readFileCache.set(filePath, { stats: newStats, contents })
    return contents
  }
}
