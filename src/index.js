'use strict'

/* @flow */

import Path from 'path'
import { readFile } from 'motion-fs'
import parseModule from './parser'
import { getModuleId } from './helpers'
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
  }
  push(filePath: string, contents: string): Pundle$Module {
    const moduleId = getModuleId(filePath, this.config.rootDirectory)
    let module = this.modules.get(moduleId)
    if (module) {
      module.body = contents
    } else {
      module = {
        body: contents,
        parents: [],
        filePath,
        children: []
      }
    }
    this.modules.set(moduleId, module)
    return module
  }
  compile(): Promise {
    return this.compileFile(this.config.mainFile)
  }
  async compileFile(filePath: string): Promise {
    const contents = (await readFile(filePath)).toString()
    const parsed = parseModule(this.config, filePath, contents)
    console.log(parsed)
  }
  generate(): string {
    return ''
  }
}

module.exports = Pundle
