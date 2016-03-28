'use strict'

/* @flow */

import Path from 'path'
import scanImports from './scanner'
import { normalizeConfig, getModuleId, moduleDirectory } from './helpers'
import type { Pundle$Config, Pundle$Module } from './types'

class Pundle {
  config: Pundle$Config;
  modules: Map<string, Pundle$Module>;

  constructor(config: Pundle$Config) {
    this.config = config
    this.modules = new Map()

    normalizeConfig(config)
  }
  async compile(): Promise {
    await Promise.all(this.config.entry.map(entry => this.read(entry)))
  }
  async generate(): Promise<string> {
    return 'Hey!'
  }
  async push(filePath: string, content: string): Promise<Pundle$Module> {
    if (!Path.isAbsolute(filePath)) {
      filePath = Path.join(this.config.rootDirectory, filePath)
    }

    const id = getModuleId(filePath, this.config)
    let module = this.modules.get(id)
    const imports = scanImports(content)
    if (module) {
      if (content === module.content) {
        return module
      }

      module.content = content
      module.imports = imports
    } else {
      module = {
        content,
        imports,
        filePath
      }
      this.modules.set(id, module)
    }

    // NOTE: Workaround a babel bug, where async arrow functions and `this` is messed up
    const _this = this
    await Promise.all(module.imports.map(async function(dependency) {
      const depDir = moduleDirectory(filePath, _this.config)
      const cachedPath = await _this.config.fileSystem.getResolvedPath(dependency, depDir)
      if (!cachedPath || !_this.modules.has(getModuleId(cachedPath, _this.config))) {
        return _this.read(dependency, Path.dirname(filePath))
      }
      return null
    }))

    return module
  }
  async read(moduleName: string, requestDirectory: ?string = null): Promise {
    if (!requestDirectory) {
      requestDirectory = this.config.rootDirectory
    }

    const filePath = await this.config.fileSystem.resolve(moduleName, requestDirectory)
    const contents = await this.config.fileSystem.readFile(filePath)
    await this.push(filePath, contents)
  }
}

module.exports = Pundle
