'use strict'

/* @flow */

import Path from 'path'
import FS from 'fs'
import sourceMapToComment from 'source-map-to-comment'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { generateBundle, generateSourceMap } from '../processor/generator'
import type { ProcessorConfig, Module } from '../types'
import type Compilation from './index.js'

const wrapperContent = FS.readFileSync(Path.join(__dirname, '..', '..', 'browser', 'wrapper.js'), 'utf8')

export default class Generator {
  emitter: Emitter;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(compilation: Compilation) {
    this.emitter = new Emitter()
    this.compilation = compilation
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  gatherImports(
    modules: Array<string>,
    imports: Array<Module> = [],
    modulesAdded: Set<string> = new Set()
  ): Array<Module> {
    for (const absId of modules) {
      const id = this.compilation.pundle.path.in(absId)

      if (modulesAdded.has(id)) {
        continue
      }
      modulesAdded.add(id)
      const module = this.compilation.modules.registry.get(id)
      if (module) {
        imports.push(module)
      } else throw new Error(`Module '${id}' not found`)
      if (module.imports.length) {
        this.gatherImports(module.imports, imports, modulesAdded)
      }
    }
    return imports
  }
  gatherAllImports(): Array<Module> {
    return this.gatherImports(this.compilation.config.entry)
  }
  generate(options: ?ProcessorConfig): string {
    if (!options) {
      options = this.getProcessorOptions()
    }
    return generateBundle(
      this.compilation.pundle,
      options,
      this.gatherAllImports(),
      this.compilation.config.entry
    )
  }
  generateSourceMap(options: ?ProcessorConfig, asComment: boolean = false): string {
    if (!options) {
      options = this.getProcessorOptions()
    }
    const sourceMap = generateSourceMap(this.compilation.pundle, options, this.gatherAllImports())
    if (asComment) {
      return sourceMapToComment(sourceMap)
    }
    return JSON.stringify(sourceMap)
  }
  getProcessorOptions(): ProcessorConfig {
    return {
      prepend: ';(function(){\n' + wrapperContent,
      append: '})();\n',
      module_register: '__sb_pundle_register',
      module_require: 'require'
    }
  }
  shouldGenerate(): boolean {
    try {
      this.gatherAllImports()
      return false
    } catch (_) {
      return true
    }
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
