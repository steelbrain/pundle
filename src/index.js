'use strict'

/* @flow */

import Path from 'path'
import FileSystem from './fs'
import parseModule from './parser'
import { getModuleId } from './helpers'
import type { Stats } from 'fs'
import type { Pundle$Config, Pundle$Module } from './types'

class Pundle {
  config: Pundle$Config;
  modules: Map<string, Pundle$Module>;
  processed: WeakMap<Pundle$Module, string>;

  constructor(config: Pundle$Config) {
    this.config = config
    this.modules = new Map()
    this.processed = new WeakMap()

    if (!Path.isAbsolute(this.config.mainFile)) {
      this.config.mainFile = Path.resolve(this.config.rootDirectory, this.config.mainFile)
    }
    if (!this.config.fileSystem) {
      this.config.fileSystem = new FileSystem(config)
    }
  }
  async compile(): Promise {
    await this.read(this.config.mainFile)
  }
  generate(): string {
    console.log(this.modules)
    return ''
  }
  push(filePath: string, stats: Stats, contents: string): Pundle$Module {
    const moduleId = getModuleId(filePath, this.config.rootDirectory)
    let module = this.modules.get(moduleId)
    if (module) {
      module.body = contents
    } else {
      module = {
        body: contents,
        stats,
        filePath,
        imports: [],
        compiled: ''
      }
    }
    this.modules.set(moduleId, module)
    this.parse(filePath)
    return module
  }
  parse(filePath: string): boolean {
    const moduleId = getModuleId(filePath, this.config.rootDirectory)
    const module = this.modules.get(moduleId)
    if (!module) {
      return false
    }
    const compiled = parseModule(this.config, filePath, module.body)
    module.compiled = compiled.code
    module.imports = compiled.imports
    return true
  }
  async read(filePath: string): Promise {
    const moduleId = getModuleId(filePath, this.config.rootDirectory)
    const module = this.modules.get(moduleId)
    const lastStats = module && module.stats || null
    const newStats = await this.config.fileSystem.stat(filePath)

    if (!newStats) {
      throw new Error(`File '${filePath}' not found`)
    }
    if ((lastStats && lastStats.mtime.getTime()) === (newStats.mtime.getTime())) {
      return
    }
    const contents = await this.config.fileSystem.readFile(filePath)
    this.push(filePath, newStats, contents)
  }
  remove(filePath: string): boolean {
    return this.modules.delete(filePath)
  }
}

module.exports = Pundle
