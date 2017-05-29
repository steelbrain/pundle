/* @flow */

import Path from 'path'

export { version } from './helpers'
export * from './rules'
export * from './issues'
export * from './components'
export * from './file'

export function getRelativeFilePath(filePath: string, rootDirectory: string): string {
  const relative = Path.relative(rootDirectory, filePath)
  if (relative.slice(0, 2) === '..') {
    return filePath
  }
  return relative
}
