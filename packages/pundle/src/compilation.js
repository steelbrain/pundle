'use strict'

/* @flow */

import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import { generateBundle, generateSourceMap } from './processor/generator'
import transform from './processor/transformer'
import type { Pundle$Module } from './types'
import type Pundle from './index.js'

export default class Compilation {
  pundle: Pundle;
  modules: Map<string, Pundle$Module>;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor(pundle: Pundle) {
    this.pundle = pundle
    this.modules = new Map()
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  async compile(): Promise {
    await Promise.all(this.pundle.config.entry.map(entry => this.read(entry)))
  }
  async read(filePath: string): Promise {
    await this.push(filePath, await this.pundle.fileSystem.readFile(this.pundle.path.out(filePath)))
  }
  async push(givenFilePath: string, contents: string): Promise {
    let event
    const filePath = this.pundle.path.in(givenFilePath)
    const oldModule = this.modules.get(filePath)
    if (oldModule && oldModule.sources === contents) {
      return
    }
    event = { filePath, contents, sourceMap: null, imports: [] }
    await this.emitter.emit('before-compile', event)
    const processed = await transform(filePath, this.pundle, event)
    event = { filePath, contents: processed.contents, sourceMap: processed.sourceMap, imports: processed.imports }
    await this.emitter.emit('after-compile', event)
    this.modules.set(filePath, {
      imports: event.imports,
      sources: contents,
      contents: event.contents,
      filePath,
      sourceMap: event.sourceMap
    })
    await Promise.all(event.imports.map(importId => {
      if (!this.modules.has(importId)) {
        return this.read(importId)
      }
      return null
    }))
  }
  generate(): string {
    return generateBundle(this.pundle, this.pundle.config.entry, this.getAllModuleImports())
  }
  generateSourceMap(): Object {
    return generateSourceMap(this.pundle, this.getAllModuleImports())
  }
  getAllModuleImports(): Array<Pundle$Module> {
    const countedIn = new Set()
    const moduleImports = []
    for (const entry of this.pundle.config.entry) {
      this.getModuleImports(this.pundle.path.in(entry), moduleImports, countedIn)
    }
    return moduleImports
  }
  getModuleImports(
    moduleId: string,
    moduleImports: Array<Pundle$Module> = [],
    countedIn: Set<string> = new Set()
  ): Array<Pundle$Module> {
    const module = this.modules.get(moduleId)
    if (!module) {
      throw new Error(`Module '${moduleId}' not found`)
    }
    countedIn.add(moduleId)
    moduleImports.push(module)
    for (const entry of module.imports) {
      if (!countedIn.has(entry)) {
        this.getModuleImports(entry, moduleImports, countedIn)
      }
    }
    return moduleImports
  }
  watch(): Disposable {

  }
  onBeforeCompile(callback: Function): Disposable {
    return this.emitter.on('before-compile', callback)
  }
  onAfterCompile(callback: Function): Disposable {
    return this.emitter.on('after-compile', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
