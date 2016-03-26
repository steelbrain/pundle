'use strict'

/* @flow */

import { getModuleId } from './helpers'
import type { Pundle$Config, Pundle$Module } from './types'

class Pundle {
  config: Pundle$Config;
  modules: Map<string, Pundle$Module>;

  constructor(config: Pundle$Config) {
    this.config = config
    this.modules = new Map()
  }
  push(filePath: string, contents: string) {
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
      this.modules.set(moduleId, module)
    }
    // TODO: Push the changes here
  }
  compile(): Promise {
    return this.compileFile(this.config.mainFile)
  }
  async compileFile(filePath: string) {
    throw new Error('Unimplemented')
  }
  generate(): string {
    return ''
  }
}

module.exports = Pundle
