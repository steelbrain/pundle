'use strict'

/* @flow */

import { posix as PosixPath } from 'path'
import type { Pundle$Config } from './types'

export default class Path {
  config: Pundle$Config;

  constructor(config: Pundle$Config) {
    this.config = config
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
}
