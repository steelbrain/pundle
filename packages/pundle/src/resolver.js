/* @flow */

import Path from 'path'
import { isLocal as isLocalModule, isCore as isCoreModule, resolve } from 'sb-resolve'
import { attachable, find } from './helpers'
import PundlePath from './path'
import type { Config, State } from './types'

const NAME_EXTRACTION_REGEX = /^([^\\\/]+)/

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
    if (isCoreModule(request)) {
      return Promise.resolve(`$core/${request}`)
    }
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
      const pathOut = this.path.out(fromFile)
      const moduleDirectories = this.config.moduleDirectories.filter(i => !Path.isAbsolute(i))
      return await resolve(request, pathOut, {
        fs: this.config.fileSystem,
        root: this.config.rootDirectory,
        process: manifest => manifest.main || './index', // TODO: Use the modules state registry here and respect browser field
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
