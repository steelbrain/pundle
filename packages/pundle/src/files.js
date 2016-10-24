/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'

export default class Files {
  files: Map<string, File>;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor() {
    this.files = new Map()
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  has(path: string): boolean {
    return this.files.has(path)
  }
  get(path: string): ?File {
    return this.files.get(path)
  }
  set(path: string, file: File): void {
    const oldValue = this.files.get(path)
    this.files.set(path, file)
    if (!oldValue) {
      this.emitter.emit('did-add', path)
    }
  }
  delete(path: string): void {
    if (this.has(path)) {
      this.files.delete(path)
      this.emitter.emit('did-delete', path)
    }
  }
  forEach(callback: ((file: File, filePath: string) => any)) {
    this.files.forEach(callback)
  }
  onDidAdd(callback: ((filePath: string) => any)): Disposable {
    return this.emitter.on('did-add', callback)
  }
  onDidDelete(callback: ((filePath: string) => any)): Disposable {
    return this.emitter.on('did-delete', callback)
  }
  dispose() {
    this.files.clear()
    this.subscriptions.dispose()
  }
}
