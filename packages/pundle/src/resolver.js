/* @flow */

import Path from 'path'
import { CompositeDisposable, Emitter } from 'sb-event-kit'
import { isCore as isCoreModule, resolve } from 'sb-resolve'
import type { Disposable } from 'sb-event-kit'
import browserMap from 'pundle-browser'
import { attachable, find } from './helpers'
import Filesystem from './filesystem'
import PundlePath from './path'
import type { Config, State } from './types'

const WHOLE_MODULE_NAME = /^[^\\\/]+$/
const WHOLE_MODULE_NAME_SLASHY = /^[^\\\/]+[\/\\]$/

@attachable('resolver')
@PundlePath.attach
@Filesystem.attach
export default class Resolver {
  fs: Filesystem;
  path: PundlePath;
  cache: Map<string, string | Promise<string>>;
  manifestCache: Map<string, ?string | Promise<?string>>;
  state: State;
  config: Config;
  emitter: Emitter;
  subscriptions: CompositeDisposable;

  constructor(state: State, config: Config) {
    this.cache = new Map()
    this.manifestCache = new Map()
    this.state = state
    this.config = config
    this.emitter = new Emitter()
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(this.emitter)
  }
  resolve(request: string, fromFile: string): Promise<string> {
    if (isCoreModule(request)) {
      return Promise.resolve(`$core/${request}.js`)
    }
    return this.getManifest(Path.dirname(fromFile)).then(manifestFile => {
      if (!manifestFile) {
        return {}
      }
      let parsed = {
        rootDirectory: Path.dirname(manifestFile),
      }
      return this.fs.read(manifestFile).then(function(contents) {
        try {
          parsed = JSON.parse(contents)
          parsed.manifestPath = manifestFile
        } catch (_) { /* */ }
        return parsed
      }, function() {
        return parsed
      })
    }).then(manifest =>
      this.resolveCached(request, fromFile, request, manifest)
    )
  }
  getManifest(directory: string): Promise<?string> {
    const cacheKey = directory
    let value = this.manifestCache.get(cacheKey)
    if (!value) {
      this.manifestCache.set(cacheKey, value = find(this.path.out(directory), 'package.json', this.config, true).then(results => {
        const result = results[0] || null
        this.manifestCache.set(cacheKey, result)
        return result
      }, error => {
        this.manifestCache.delete(cacheKey)
        throw error
      }))
    }
    if (typeof value === 'string') {
      return Promise.resolve(value)
    }
    return value
  }
  resolveCached(request: string, fromFile: string, givenRequest: string, manifest: Object): Promise<string> {
    const cacheKey = `request:${request}:from:${Path.dirname(fromFile)}:browser:${JSON.stringify(manifest.browser)}`
    let value = this.cache.get(cacheKey)
    if (!value) {
      this.cache.set(cacheKey, value = this.resolveUncached(request, fromFile, givenRequest, manifest).then(result => {
        this.cache.set(cacheKey, result)
        return result
      }, error => {
        this.cache.delete(cacheKey)
        throw error
      }))
    }
    if (typeof value === 'string') {
      return Promise.resolve(value)
    }
    return value
  }
  async resolveUncached(requestString: string, fromFile: string, givenRequest: string, manifest: Object): Promise<string> {
    let request = requestString
    const extensions = Array.from(this.state.loaders.keys())
    if (manifest.browser && typeof manifest.browser === 'object') {
      request = Resolver.resolveLocalBrowserField(request, manifest, extensions)
    }

    const event = { filePath: request, fromFile: this.path.out(fromFile), givenRequest, manifest, resolved: false }
    await this.emitter.emit('before-resolve', event)

    if (!event.resolved) {
      try {
        const moduleDirectories = this.config.moduleDirectories.filter(i => !Path.isAbsolute(i))
        event.filePath = await resolve(event.filePath, event.fromFile, {
          fs: this.config.fileSystem,
          root: this.config.rootDirectory,
          process(remoteManifest) {
            return remoteManifest.browser ? Resolver.resolveRemoteBrowserField(request, remoteManifest) : remoteManifest.main
          },
          extensions,
          moduleDirectories: this.config.moduleDirectories.concat(await find(Path.dirname(event.fromFile), moduleDirectories, this.config)),
        })
        event.resolved = true
      } catch (error) { /* No Op */ }
    }

    await this.emitter.emit('after-resolve', event)
    if (!event.resolved) {
      const error = new Error(`Cannot find module '${givenRequest}'`)
      // $FlowIgnore: Custom error property
      error.code = 'MODULE_NOT_FOUND'
      error.stack = `${error.message}\n    at ${fromFile}:0:0`
      throw error
    }
    return event.filePath
  }
  onBeforeResolve(callback: Function): Disposable {
    return this.emitter.on('before-resolve', callback)
  }
  onAfterResolve(callback: Function): Disposable {
    return this.emitter.on('after-resolve', callback)
  }
  dispose() {
    this.cache.clear()
  }
  static resolveRemoteBrowserField(request: string, manifest: Object) {
    const main = manifest.main || './index'
    const manifestDirectory = Path.dirname(manifest.manifestPath)
    if (typeof manifest.browser === 'string') {
      return WHOLE_MODULE_NAME.test(request) || WHOLE_MODULE_NAME_SLASHY.test(request) ? Path.join(manifestDirectory, manifest.browser) : main
    } else if (typeof manifest.browser !== 'object') {
      return main
    }
    const relativePath = './' + Path.relative('.', main)
    const value = manifest.browser[relativePath]
    if (value === false) {
      return browserMap.empty
    } else if (value) {
      return manifest.browser[relativePath]
    }
    return main
  }
  static resolveLocalBrowserField(request: string, manifest: Object, extensions: Array<string>) {
    const manifestExtensions = [''].concat(extensions)
    for (let i = 0, length = manifestExtensions.length; i < length; ++i) {
      const key = `${request}${manifestExtensions[i]}`
      if ({}.hasOwnProperty.call(manifest.browser, key)) {
        const value = manifest.browser[key]
        if (!value) {
          return browserMap.empty
        }
        request = value
        if (request.substr(0, 1) === '.') {
          return Path.resolve(Path.dirname(manifest.manifestPath), request)
        }
        break
      }
    }
    return request
  }
}
