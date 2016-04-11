'use strict'

/* @flow */

import { posix as PosixPath } from 'path'
import { CompositeDisposable, Emitter, Disposable } from 'sb-event-kit'
import { isCore } from 'sb-resolve'
import type FileSystem from './file-system'
import type { Config } from './types'

export default class Path {
  config: Config;
  emitter: Emitter;
  fileSystem: FileSystem;
  subscriptions: CompositeDisposable;

  constructor(config: Config, fileSystem: FileSystem) {
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
    return PosixPath.normalize(filePath)
  }
  out(filePath: string, file: boolean = true): string {
    if (file && filePath === '$root') {
      return filePath
    }
    if (filePath.indexOf('$root') === 0) {
      filePath = PosixPath.join(this.config.rootDirectory, PosixPath.relative('$root', filePath))
    }
    return filePath
  }
  async resolveModule(moduleName: string, basedir: string): Promise<string> {
    const event = { moduleName, basedir: this.out(basedir, false), path: '' }
    await this.emitter.emit('before-module-resolve', event)
    if (!event.path) {
      try {
        event.path = await this.fileSystem.resolve(moduleName, event.basedir)
      } catch (_) {
        if (_.code !== 'MODULE_NOT_FOUND') {
          throw _
        }
      }
    }
    await this.emitter.emit('after-module-resolve', event)
    if (!event.path) {
      throw new Error(`Unable to resolve '${moduleName}' from '${basedir}'`)
    } else if (isCore(event.moduleName)) {
      return PosixPath.join('$core', event.moduleName)
    } else if (event.path.substr(0, 1) === '/' && PosixPath.extname(event.path) === '') {
      // Paths to module directories and stuff like that, absolute
      // We are doing this so the event listeners don't have to reinvent the resolution wheel
      event.path = await this.fileSystem.resolve(event.path, event.basedir)
    }
    return this.in(event.path)
  }
  onBeforeModuleResolve(callback: Function): Disposable {
    return this.emitter.on('before-module-resolve', callback)
  }
  onAfterModuleResolve(callback: Function): Disposable {
    return this.emitter.on('after-module-resolve', callback)
  }
  dispose() {
    this.subscriptions.dispose()
  }
}
