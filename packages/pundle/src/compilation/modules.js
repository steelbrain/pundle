'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import transform from '../processor/transform'
import { arrayDifference } from './helpers'
import type { Disposable } from 'sb-event-kit'
import type { Module } from '../types'
import type Compilation from './index.js'

export default class Modules {
  emitter: Emitter;
  registry: Map<string, Module>;
  compilation: Compilation;
  subscriptions: CompositeDisposable;

  constructor(compilation: Compilation) {
    this.emitter = new Emitter()
    this.registry = new Map()
    this.compilation = compilation
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  async read(filePath: string): Promise {
    const pundle = this.compilation.pundle
    await this.push(filePath, await pundle.fileSystem.readFile(pundle.path.out(filePath)))
  }
  async push(givenFilePath: string, contents: string): Promise {
    const filePath = this.compilation.pundle.path.in(givenFilePath)
    const oldModule = this.registry.get(filePath)
    if (oldModule && oldModule.sources === contents) {
      return
    }

    let event
    event = { filePath, contents, sourceMap: null, imports: [], oldModule }
    await this.emitter.emit('before-compile', event)
    const processed = await transform(filePath, this.compilation.pundle, event)
    event = { filePath, contents: processed.contents, sourceMap: processed.sourceMap, imports: processed.imports, oldModule }
    this.emitter.emit('after-compile', event)
    this.registry.set(filePath, {
      imports: event.imports,
      sources: contents,
      contents: event.contents,
      filePath,
      sourceMap: event.sourceMap
    })
    try {
      await Promise.all(event.imports.map(importId => {
        if (!this.registry.has(importId)) {
          return this.read(importId)
        }
        return null
      }))
    } catch (error) {
      if (oldModule) {
        this.registry.set(filePath, oldModule)
      } else this.registry.delete(filePath)
      throw error
    }
    const importsDifference = arrayDifference(oldModule && oldModule.imports || [], event.imports)
    if (importsDifference.added.length || importsDifference.removed.length) {
      this.garbageCollect()
    }
    await this.emitter.emit('did-compile', event)
  }
  garbageCollect() {
    const toRemove = []
    const modules = new Set(this.compilation.generator.gatherAllImports())
    for (const [key, value] of this.registry) {
      if (key !== '$root' && !modules.has(value)) {
        toRemove.push(key)
      }
    }
    for (const entry of toRemove) {
      this.registry.delete(entry)
    }
  }
  onBeforeCompile(callback: Function): Disposable {
    return this.emitter.on('before-compile', callback)
  }
  onAfterCompile(callback: Function): Disposable {
    // Callbacks must be synchronus, for minification or similar purposes
    return this.emitter.on('after-compile', callback)
  }
  onDidCompile(callback: Function): Disposable {
    // Callbacks can be asynchronus, for data collection or similar purposes
    return this.emitter.on('did-compile', callback)
  }
  dispose() {
    this.registry.clear()
    this.subscriptions.dispose()
  }
}
