/* @flow */

import Path from 'path'

export { version } from './helpers'
export * from './rules'
export * from './errors'
export * from './components'

export function getRelativeFilePath(filePath: string, rootDirectory: string): string {
  const relative = Path.relative(rootDirectory, filePath)
  if (relative.slice(0, 2) === '..') {
    return filePath
  }
  return relative
}
