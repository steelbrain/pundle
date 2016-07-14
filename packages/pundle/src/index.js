/* @flow */

import Path from 'path'
import invariant from 'assert'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import type { Disposable } from 'sb-event-kit'
import * as Helpers from './helpers'
import applyLoaders from './loaders'
import Files from './files'
import Resolver from './resolver'
import PundlePath from './path'
import FileSystem from './filesystem'
import type { Config, State } from './types'

@Files.attach
@Resolver.attach
@PundlePath.attach
@FileSystem.attach
class Pundle {
  fs: FileSystem;
  path: PundlePath;
  state: State;
  files: Files;
  config: Config;
  emitter: Emitter;
  resolver: Resolver;
  subscriptions: CompositeDisposable;

  constructor(config: Object) {
    this.state = {
      loaders: new Map(),
    }
    this.config = Helpers.fillConfig(config)
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
    applyLoaders(this)
    // TODO: Use this.files's events to add or remove files from watcher, it'll be super-efficient that way as we'll only be watching what we required
  }
  async read(givenFilePath: string): Promise<void> {
    const filePath = this.path.in(givenFilePath)
    if (this.files.has(filePath) && !await this.fs.isChanged(givenFilePath)) {
      return
    }
    const extension = Path.extname(filePath)
    const contents = await this.fs.read(filePath)
    const loader = this.state.loaders.get(extension)
    invariant(loader, `Unrecognized extension '${extension}' for '${givenFilePath}'`)
    const event: { filePath: string, contents: string, sourceMap: ?Object } = { filePath, contents, sourceMap: null }
    this.emitter.emit('before-process', event)
    let result = loader(this, filePath, contents, event.sourceMap)
    if (result instanceof Promise) {
      result = await result
    }
    event.contents = result.contents
    event.sourceMap = result.sourceMap
    this.emitter.emit('after-process', event)
  }
  async compile(): Promise<void> {
    await Promise.all(this.config.entry.map(entry => this.read(entry)))
  }
  onBeforeProcess(callback: Function): Disposable {
    return this.emitter.on('before-process', callback)
  }
  onAfterProcess(callback: Function): Disposable {
    return this.emitter.on('after-process', callback)
  }
  onError(callback: Function): Disposable {
    return this.emitter.on('error', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Pundle
