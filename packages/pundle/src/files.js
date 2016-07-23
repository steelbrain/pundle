/* @flow */

import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'
import PundlePath from './path'
import { attachable } from './helpers'
import type { File, Config, State } from './types'

@PundlePath.attach
@attachable('files')
export default class Files {
  path: PundlePath;
  config: Config;
  state: State;
  files: Map<string, File>;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor(state: State, config: Config) {
    this.config = config
    this.state = state
    this.files = new Map()
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  has(path: string): boolean {
    return this.files.has(this.path.in(path))
  }
  get(path: string): ?File {
    return this.files.get(this.path.in(path))
  }
  set(path: string, file: File): void {
    const internalPath = this.path.in(path)
    const oldValue = this.files.get(internalPath)
    this.files.set(internalPath, file)
    if (!oldValue) {
      this.emitter.emit('did-add', internalPath)
    }
  }
  delete(path: string): void {
    const internalPath = this.path.in(path)
    if (this.has(internalPath)) {
      this.files.delete(internalPath)
      this.emitter.emit('did-delete', internalPath)
    }
  }
  forEach(callback: ((file: File, filePath: string) => any)) {
    this.files.forEach(callback)
  }
  getOccurancesOf(path: string): number {
    let occurances = 0
    for (const file of this.files.values()) {
      for (const entry of file.imports) {
        if (entry === path) {
          occurances++
        }
      }
    }
    return occurances
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
