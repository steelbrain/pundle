'use strict'

/* @flow */

import Path from 'path'
import Puth from './puth'
import scanModule from './transformer/scanner'
import { normalizeConfig } from './helpers'
import type { Pundle$State, Pundle$Config, Pundle$Module } from './types'

class Pundle {
  state: Pundle$State;
  modules: Map<string, Pundle$Module>;

  constructor(config: Pundle$Config) {
    this.state = {
      puth: new Puth(config),
      config
    }
    this.modules = new Map()

    normalizeConfig(config)
  }
  async compile(): Promise {
    await Promise.all(this.state.config.entry.map(entry => this.read(entry)))
  }
  async generate(): Promise<string> {
    return 'Hey!'
  }
  async read(moduleName: string, requestDirectory: ?string = null): Promise {
    if (!requestDirectory) {
      requestDirectory = this.state.config.rootDirectory
    }

    moduleName = this.state.puth.out(moduleName)
    const filePath = Path.isAbsolute(moduleName) ?
      moduleName :
      await this.state.config.fileSystem.resolve(moduleName, requestDirectory)
    const contents = await this.state.config.fileSystem.readFile(filePath)
    await this.push(filePath, contents)
  }
  async push(filePath: string, content: string): Promise<Pundle$Module> {
    const id = this.state.puth.in(filePath)
    let module = this.modules.get(id)
    const scanned = scanModule(filePath, content, this.state)
    if (module) {
      if (content === scanned.content) {
        return module
      }

      module.content = scanned.content
      module.imports = scanned.imports
    } else {
      module = {
        content: scanned.content,
        imports: scanned.imports,
        filePath
      }
      this.modules.set(id, module)
    }

    // NOTE: Workaround a babel bug, where async arrow functions and `this` is messed up
    const _this = this
    await Promise.all(module.imports.map(async function(dependency) {
      if (!_this.modules.has(_this.state.puth.in(dependency))) {
        console.log(dependency, Path.dirname(filePath))
        return await _this.read(dependency, Path.dirname(filePath))
      }
      return null
    }))

    return module
  }
}

module.exports = Pundle
