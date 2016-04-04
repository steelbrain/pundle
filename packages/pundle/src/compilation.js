'use strict'

/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import generateBundle from './processor/generator'
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
    try {
      await this.push(filePath, await this.pundle.fileSystem.readFile(
        this.pundle.path.out(filePath)
      ))
    } catch (_) {
      await this.pundle.emitter.emit('caught-error', _)
    }
  }
  async push(givenFilePath: string, contents: string): Promise {
    try {
      await this._push(givenFilePath, contents)
    } catch (_) {
      this.pundle.emitter.emit('caught-error', _)
    }
  }
  // Private method
  async _push(givenFilePath: string, contents: string): Promise {
    const filePath = this.pundle.path.in(givenFilePath)
    const oldModule = this.modules.get(filePath)
    if (oldModule && oldModule.sources === contents) {
      return
    }
    const beforeEvent = { filePath, contents, sourceMap: null, imports: [] }
    await this.emitter.emit('before-compile', beforeEvent)
    const processed = await transform(filePath, beforeEvent.contents, beforeEvent.sourceMap, this.pundle)
    const eventAfter = {
      filePath,
      contents: processed.contents,
      sourceMap: processed.sourceMap,
      imports: processed.imports
    }
    await this.emitter.emit('after-compile', eventAfter)
    const newModule = {
      imports: eventAfter.imports,
      sources: contents,
      contents: eventAfter.contents,
      filePath,
      sourceMap: eventAfter.sourceMap
    }
    this.modules.set(filePath, newModule)
    await Promise.all(eventAfter.imports.map(importId => {
      if (!this.modules.has(importId)) {
        return this.read(importId)
      }
      return null
    }))
  }
  generate(): ?string {
    try {
      return generateBundle(this.pundle, this.modules)
    } catch (_) {
      this.pundle.emitter.emit('caught-error', _)
      return null
    }
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
