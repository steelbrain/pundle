'use strict'

/* @flow */

import Path from 'path'
import { normalizeConfig } from './helpers'
import type { Pundle$Config } from './types'

class Pundle {
  config: Pundle$Config;

  constructor(config: Pundle$Config) {
    this.config = config

    normalizeConfig(config)
  }
  async compile(): Promise {

  }
  async generate(): Promise<string> {
    return 'Hey!'
  }
  async push(filePath: string, content: string): Promise<Pundle$Module> {
    if (Path.isAbsolute(filePath)) {
      filePath = Path.relative(this.config.rootDirectory, filePath)
    }
    let module = this.modules.get(moduleId)
    if (module) {
      module.content = content
    } else {
      module = {
        content,
        filePath,
        imports: []
      }
    }
    this.modules.set(moduleId, module)
    await Promise.all(module.imports.map(dependency =>
      this.read(dependency, Path.dirname(filePath))
    ))
    return module
  }
  async read(moduleName: string, requestDirectory: ?string = null): Promise {
    if (!requestDirectory) {
      requestDirectory = this.config.rootDirectory
    }

    const filePath = Path.relative(this.config.rootDirectory,
        await this.config.fileSystem.resolve(moduleName, requestDirectory))

    const contents = await this.config.fileSystem.readFile(filePath)
    await this.push(filePath, contents)
  }
  remove(filePath: string): boolean {

  }
}

module.exports = Pundle
