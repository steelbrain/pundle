/* @flow */

import Path from 'path'
import browserMap from 'pundle-browser'
import { attachable } from './helpers'
import type { State, Config } from './types'

@attachable('path')
export default class PundlePath {
  state: State;
  config: Config;

  constructor(state: State, config: Config) {
    this.state = state
    this.config = config
  }
  in(path: string): string {
    if (path.substr(0, 5) === '$root') {
      return path
    }
    if (path.substr(0, 5) === '$core') {
      return path
    }
    const resolvedPath = Path.isAbsolute(path) ? path : Path.resolve(this.config.rootDirectory, path)
    const relativePath = Path.relative(this.config.rootDirectory, resolvedPath)
    return relativePath ? `$root/${relativePath}` : '$root'
  }
  out(path: string): string {
    if (path.substr(0, 5) === '$core') {
      return browserMap[path.slice(6, -3)] || browserMap.empty
    }
    if (path.substr(0, 5) === '$root') {
      if (path.length === 5) {
        return this.config.rootDirectory
      }
      const relativePath = Path.relative('$root', path)
      return Path.join(this.config.rootDirectory, relativePath)
    }
    if (!Path.isAbsolute(path)) {
      return Path.resolve(this.config.rootDirectory, path)
    }
    return path
  }
}
