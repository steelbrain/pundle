'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { generateBundle, generateSourceMap } from './processor/generator'
import transform from './processor/transformer'
import type { Disposable } from 'sb-event-kit'
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
    return generateBundle(this.pundle, this.modules)
  }
  generateSourceMap(): Object {
    return generateSourceMap(this.pundle, this.modules)
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
