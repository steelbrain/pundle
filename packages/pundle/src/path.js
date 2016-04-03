'use strict'

/* @flow */

import { isCore } from 'sb-resolve'
import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import { posix as PosixPath } from 'path'
import type FileSystem from './file-system'
import type { Pundle$Config } from './types'

export default class Path {
  config: Pundle$Config;
  emitter: Emitter;
  fileSystem: FileSystem;
  subscriptions: CompositeDisposable;

  constructor(config: Pundle$Config, fileSystem: FileSystem) {
    this.config = config
    this.emitter = new Emitter()
    this.fileSystem = fileSystem
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  in(filePath: string): string {
    if (filePath.indexOf(this.config.rootDirectory) === 0) {
      filePath = PosixPath.join('$root', PosixPath.relative(this.config.rootDirectory, filePath))
    }
    return filePath
  }
  out(filePath: string): string {
    if (filePath.indexOf('$root') === 0) {
      filePath = PosixPath.join(this.config.rootDirectory, PosixPath.relative('$root', filePath))
    }
    return filePath
  }
  async resolveModule(moduleName: string, basedir: string): Promise<string> {
    const event = { moduleName, basedir, path: '' }
    await this.emitter.emit('module-resolve', event)
    if (!event.path) {
      event.path = await this.fileSystem.resolve(moduleName, this.out(event.basedir))
    }
    if (isCore(moduleName)) {
      throw new Error('Module is core')
    }
    return this.in(event.path)
  }
  onModuleResolve(callback: Function): Disposable {
    return this.emitter.on('module-resolve', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
