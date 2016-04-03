'use strict'

/* @flow */

import Path from 'path'
import memoize from 'sb-memoize'
import resolve from 'sb-resolve'
import { find } from './helpers'
import type { Stats } from 'fs'
import type { Pundle$FileSystem, Pundle$Config } from './types'

export default class FileSystem {
  config: Pundle$Config;
  source: Pundle$FileSystem;
  readFileCache: Map<string, { stats: Stats, contents: string }>;
  cachedResolve: ((moduleName: string, basedir: string) => Promise<string>);

  constructor(config: Pundle$Config, source: Pundle$FileSystem) {
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
    const parents = (await find(basedir, config.moduleDirectories || ['node_modules'], this.source))
      .map(Path.dirname)
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
    const cached = this.readFileCache.get(filePath)
    const newStats = await this.stat(filePath)
    if (cached && useCached) {
      if (cached.stats.mtime.getTime() === newStats.mtime.getTime()) {
        return cached.contents
      }
    }
    const contents = await this.source.readFile(filePath)
    this.readFileCache.set(filePath, { stats: newStats, contents })
    return contents
  }
}
