/* @flow */

import Path from 'path'
import createIgnore from 'ignore'
import type { ComponentRules } from '../types'

export function matchesRules(
  relativePath: string,
  rules: Array<string>
): boolean {
  const fileName = Path.basename(relativePath)
  const fancyRules = []

  for (let i = 0, length = rules.length; i < length; i++) {
    const rule = rules[i]
    if (!(rule instanceof RegExp)) {
      fancyRules.push(rule)
      continue
    }
    if (rule.test(relativePath) || rule.test(fileName)) {
      return true
    }
  }

  return !!(
    fancyRules.length &&
    createIgnore()
      .add(fancyRules)
      .filter([relativePath, fileName]).length !== 2
  )
}

export function shouldProcess(
  sourceRoot: string,
  filePath: string,
  config: ComponentRules
): boolean {
  const relativePath = Path.relative(sourceRoot, filePath)

  const exclude = config.exclude
  if (exclude) {
    if (matchesRules(relativePath, [].concat(exclude))) {
      return false
    }
  }
  const include = config.include
  if (include) {
    if (!matchesRules(relativePath, [].concat(include))) {
      return false
    }
  }
  const extensions = config.extensions
  if (extensions) {
    const fileExtension = Path.extname(filePath).slice(1)
    if (extensions.indexOf(fileExtension) === -1) {
      return false
    }
  }

  // NOTE: If neither include nor exclude is provided, instead of processing all files, process none
  return !!(include || exclude || extensions)
}
