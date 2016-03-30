'use strict'

/* @flow */

import memoize from 'sb-memoize'
import type { Stats } from 'fs'
import type { Pundle$FileSystem } from './types'

export default class FileSystem {
  source: Pundle$FileSystem;
  readFileCache: Map<string, { stats: Stats, contents: string }>;
  cachedResolve: ((moduleName: string, basedir: string) => Promise<string>);

  constructor(source: Pundle$FileSystem) {
    this.source = source
    this.readFileCache = new Map()
    this.cachedResolve = memoize(function(moduleName: string, basedir: string) {
      return this.source.resolve(moduleName, basedir)
    }, { async: true })
  }
  stat(path: string): Promise<Stats> {
    return this.source.stat(path)
  }
  statSync(path: string): Stats {
    return this.source.statSync(path)
  }
  async resolve(moduleName: string, basedir: string, cached: boolean = true): Promise<string> {
    const cacheKey = JSON.stringify([moduleName, basedir])
    let value
    if (cached) {
      value = await this.cachedResolve(moduleName, basedir)
    } else {
      value = await this.source.resolve(moduleName, basedir)
    }
    this.cachedResolve.__sb_cache[cacheKey] = value
    return value
  }
  resolveSync(moduleName: string, basedir: string, cached: boolean = true): string {
    const cacheKey = JSON.stringify([moduleName, basedir])
    let value
    if (cached && typeof this.cachedResolve.__sb_cache[cacheKey] === 'string') {
      value = this.cachedResolve.__sb_cache[cacheKey]
    } else {
      value = this.source.resolveSync(moduleName, basedir)
    }
    this.cachedResolve.__sb_cache[cacheKey] = value
    return value
  }
  async readFile(filePath: string, useCached: boolean): Promise<string> {
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
  readFileSync(filePath: string, useCached: boolean): string {
    const cached = this.readFileCache.get(filePath)
    const newStats = this.statSync(filePath)
    if (cached && useCached) {
      if (cached.stats.mtime.getTime() === newStats.mtime.getTime()) {
        return cached.contents
      }
    }
    const contents = this.source.readFileSync(filePath)
    this.readFileCache.set(filePath, { stats: newStats, contents })
    return contents
  }
}
