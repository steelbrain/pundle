/* @flow */

import Path from 'path'
import createIgnore from 'ignore'
import type { Rule, Config } from './types'

export function matchesRules(relativePath: string, rules: Array<Rule>): boolean {
  const fileName = Path.basename(relativePath)
  const ignoreRules = []

  for (let i = 0, length = rules.length; i < length; i++) {
    const rule = rules[i]
    if (!(rule instanceof RegExp)) {
      ignoreRules.push(rule)
      continue
    }
    if (rule.test(relativePath) || rule.test(fileName)) {
      return true
    }
  }

  if (ignoreRules.length && createIgnore().add(ignoreRules).filter([relativePath, fileName]).length !== 2) {
    return true
  }

  return false
}

export function shouldProcess(sourceRoot: string, filePath: string, config: Config): boolean {
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

  // NOTE: If neither include nor exclude is provided, instead of processing all files, process none
  return !!(include || exclude)
}
