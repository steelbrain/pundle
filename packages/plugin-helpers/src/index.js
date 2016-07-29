/* @flow */

import Path from 'path'
import type { Rule, Config } from './types'

const HAS_PATH_SEPARATOR = /[\\\/]/

export function matchesRules(sourceRoot: string, filePath: string, rules: Array<Rule>): boolean {
  const fileBaseName = Path.basename(filePath)

  for (let i = 0, length = rules.length; i < length; ++i) {
    let entry = rules[i]
    if (typeof entry === 'string') {
      // Path is string
      if (HAS_PATH_SEPARATOR.test(entry)) {
        // has slashes in it
        if (!Path.isAbsolute(entry)) {
          // Non-Absolute, make it absolute
          entry = Path.resolve(sourceRoot, entry)
        }
        if (Path.extname(entry)) {
          // Validation for file path
          if (entry === filePath) {
            return true
          }
        } else {
          // Validation for directory path
          if (filePath.indexOf(entry) === 0) {
            return true
          }
        }
        continue
      }
      if (entry.substr(0, 1) === '.' && fileBaseName.lastIndexOf('.') !== 0) {
        // Ext validation
        if (Path.extname(fileBaseName) === entry) {
          return true
        }
        continue
      }
      // Validation for file name
      if (entry === fileBaseName) {
        return true
      }
      continue
    }
    if (entry instanceof RegExp) {
      if (entry.test(filePath)) {
        return true
      }
      continue
    }
    console.error('Invalid rule type detected in pundle rule validator. Setup a breakpoint here to debug the cause')
  }

  return false
}
export function shouldProcess(sourceRoot: string, filePath: string, config: Config): boolean {
  const exclude = config.exclude
  if (exclude) {
    if (matchesRules(sourceRoot, filePath, [].concat(exclude))) {
      return false
    }
  }
  const include = config.include
  if (include) {
    if (!matchesRules(sourceRoot, filePath, [].concat(include))) {
      return false
    }
  }
  if (!config.extensions.length) {
    return !!(include || exclude)
  }
  return matchesRules(sourceRoot, filePath, config.extensions)
}
