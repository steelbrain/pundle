'use strict'

/* @flow */

// NOTE: Puth = Pundle + Path
import { posix as Path } from 'path'
import type { Pundle$Config } from './types'

export default class Puth {
  config: Pundle$Config;

  constructor(config: Pundle$Config) {
    this.config = config
  }
  in(filePath: string): string {
    if (filePath.indexOf(this.config.rootDirectory) === 0) {
      filePath = Path.join('$root', Path.relative(this.config.rootDirectory, filePath))
    }
    return filePath
  }
  out(filePath: string): string {
    if (filePath.indexOf('$root') === 0) {
      filePath = Path.join(this.config.rootDirectory, Path.relative('$root', filePath))
    }
    return filePath
  }
}
