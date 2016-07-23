/* @flow */

import Path from 'path'
import { isCore as isCoreModule, resolve } from 'sb-resolve'
import browserMap from 'pundle-browser'
import { attachable, find } from './helpers'
import Filesystem from './filesystem'
import PundlePath from './path'
import type { Config, State } from './types'

const WHOLE_MODULE_NAME = /^[^\\\/]+$/

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

  constructor(state: State, config: Config) {
    this.cache = new Map()
    this.manifestCache = new Map()
    this.state = state
    this.config = config
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
          // $FlowIgnore: Stupid flow
          parsed.rootDirectory = Path.dirname(manifestFile)
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
      this.manifestCache.set(cacheKey, value = find(this.path.out(directory), 'package.json', this.config, 100).then(results => {
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

    if (manifest.browser && WHOLE_MODULE_NAME.test(request) && {}.hasOwnProperty.call(manifest.browser, request)) {
      if (!manifest.browser[request]) {
        return browserMap.empty
      }
      request = manifest.browser[request]
      if (request.substr(0, 1) === '.') {
        request = Path.resolve(manifest.rootDirectory, request)
      }
    }

    try {
      const pathOut = this.path.out(fromFile)
      const moduleDirectories = this.config.moduleDirectories.filter(i => !Path.isAbsolute(i))
      return await resolve(request, pathOut, {
        fs: this.config.fileSystem,
        root: this.config.rootDirectory,
        extensions: Array.from(this.state.loaders.keys()),
        moduleDirectories: this.config.moduleDirectories.concat(await find(Path.dirname(pathOut), moduleDirectories, this.config)),
      })
    } catch (error) {
      error.message = `Cannot find module '${givenRequest}'`
      error.stack = `${error.message}\n    at ${fromFile}:0:0`
      throw error
    }
  }
  dispose() {
    this.cache.clear()
  }
}
