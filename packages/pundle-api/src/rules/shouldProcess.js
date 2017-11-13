// @flow

import Path from 'path'
import matchesRules from './matchesRules'
import type { ComponentRules } from '../types'

export default function shouldProcess(sourceRoot: string, filePath: string, config: ComponentRules): boolean {
  const relativePath = Path.relative(sourceRoot, filePath)

  const exclude = config.exclude
  if (exclude && exclude.length) {
    if (matchesRules(relativePath, [].concat(exclude))) {
      return false
    }
  }
  const include = config.include
  if (include && include.length) {
    if (!matchesRules(relativePath, [].concat(include))) {
      return false
    }
  }
  const extensions = config.extensions
  if (extensions && extensions.length) {
    if (![].concat(extensions).includes(Path.extname(filePath))) {
      return false
    }
  }

  // NOTE: If neither include nor exclude is provided, instead of processing all files, process none
  return !!((exclude && exclude.length) || (include && include.length) || (extensions && extensions.length))
}
