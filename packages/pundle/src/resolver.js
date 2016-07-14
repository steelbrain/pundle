/* @flow */

import Path from 'path'
import { isLocal as isLocalModule, resolve } from 'sb-resolve'
import { attachable } from './helpers'
import PundlePath from './path'
import type { Config, State } from './types'

const NAME_EXTRACTION_REGEX = /^([\-\_\w]+)/

@attachable('resolver')
@PundlePath.attach
export default class Resolver {
  path: PundlePath;
  cache: Map<string, string | Promise<string>>;
  state: State;
  config: Config;

  constructor(state: State, config: Config) {
    this.cache = new Map()
    this.state = state
    this.config = config
  }
  resolve(request: string, fromFile: string): Promise<string> {
    let name = NAME_EXTRACTION_REGEX.exec(request)
    if (isLocalModule(request) || !name) {
      return this.resolveCached(request, fromFile, request)
    }
    name = name[0]
    return this.resolveCached(`${name}/package.json`, fromFile, request).then(result =>
      this.resolveCached(Path.join(Path.dirname(result), request.substr(name.length)), fromFile, request)
    )
  }
  resolveCached(request: string, fromFile: string, givenRequest: string): Promise<string> {
    const cacheKey = `request:${request}:from:${fromFile}`
    let value = this.cache.get(cacheKey)
    if (!value) {
      this.cache.set(cacheKey, value = this.resolveUncached(request, fromFile, givenRequest).then(result => {
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
  async resolveUncached(request: string, fromFile: string, givenRequest: string): Promise<string> {
    try {
      return await resolve(request, this.path.out(fromFile), {
        fs: this.config.fileSystem,
        root: this.config.rootDirectory,
        process: manifest => manifest.main || './index', // TODO: Use the modules state registry here and respect browser field
        extensions: Array.from(this.state.loaders.keys()),
        moduleDirectories: this.config.moduleDirectories,
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
