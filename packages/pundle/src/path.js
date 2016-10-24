/* @flow */

import Path from 'path'
import browserMap from 'pundle-browser'
import invertKeysAndVals from 'lodash.invert'
import type { Config } from './types'

const browserMapReverse = invertKeysAndVals(browserMap)

export default class PundlePath {
  config: Config;

  constructor(config: Config) {
    this.config = config
  }
  in(path: string): string {
    if (browserMapReverse[path]) {
      return `$core/${browserMapReverse[path]}.js`
    }
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
