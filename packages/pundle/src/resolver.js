/* @flow */

import Path from 'path'
import { isLocal as isLocalModule, resolve } from 'sb-resolve'
import { attachable } from './helpers'
import type { Config, State } from './types'

const NAME_EXTRACTION_REGEX = /^([\-\_\w]+)/

@attachable('resolver')
export default class Resolver {
  cache: Map<string, string | Promise<string>>;
  state: State;
  config: Config;

  constructor(state: State, config: Config) {
    this.cache = new Map()
    this.state = state
    this.config = config
  }
  resolve(request: string, from: string): Promise<string> {
    let name = NAME_EXTRACTION_REGEX.exec(request)
    if (isLocalModule(request) || !name) {
      return this.resolveCached(request, from, request)
    }
    name = name[0]
    return this.resolveCached(`${name}/package.json`, from, request).then(result =>
      this.resolveCached(Path.join(Path.dirname(result), request.substr(name.length)), from, request)
    )
  }
  resolveCached(request: string, from: string, givenRequest: string): Promise<string> {
    const cacheKey = `request:${request}:from:${from}`
    let value = this.cache.get(cacheKey)
    if (!value) {
      this.cache.set(cacheKey, value = this.resolveUncached(request, from, givenRequest).then(result => {
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
  async resolveUncached(request: string, from: string, givenRequest: string): Promise<string> {
    try {
      return await resolve(request, Path.dirname(from), {
        fs: this.config.fileSystem,
        root: this.config.rootDirectory,
        process: manifest => manifest.main || './index', // TODO: Use the modules state registry here and respect browser field
        extensions: Array.from(this.state.loaders.keys()),
        moduleDirectories: this.config.moduleDirectories,
      })
    } catch (_) {
      const error = new Error(`Cannot find module '${givenRequest}'`)
      // $FlowIgnore: This is our custom property
      error.code = 'MODULE_NOT_FOUND'
      // $FlowIgnore: Another custom property
      error.items_searched = _.items_searched
      error.stack = `${error.message}\n    at ${from}:0:0`
      throw error
    }
  }
  dispose() {
    this.cache.clear()
  }
}
