/* @flow */

import Path from 'path'
import Context from './context'
import { File, FEATURES } from './file'

export { version } from './helpers'
export * from './components'
export * from './issues'
export * from './rules'

export function getRelativeFilePath(filePath: string, rootDirectory: string): string {
  const relative = Path.relative(rootDirectory, filePath)
  if (relative.slice(0, 2) === '..') {
    return filePath
  }
  return relative
}

export {
  File,
  Context,
  FEATURES,
}
