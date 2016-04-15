'use strict'

/* @flow */

import invariant from 'assert'
import sourceMapToComment from 'source-map-to-comment'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { generateBundle, generateSourceMap } from '../processor/generator'
import type { ProcessorConfig, Module } from '../types'
import type Compilation from './index.js'

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
      if (absId === '$root') {
        continue
      }

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
  generateAdvanced(options: Object, imports: Array<Module>): string {
    return generateBundle(this.compilation.pundle, Object.assign(this.getProcessorOptions(), options), imports, [])
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
    const root = this.compilation.modules.registry.get('$root')
    invariant(root)

    return {
      prepend: ';(function(){' + root.contents + '\n',
      append: '})();\n',
      module_register: '__sb_pundle_register'
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
