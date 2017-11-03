// @flow

import Path from 'path'
import createIgnore from 'ignore'

export default function matchesRules(relativePath: string, rules: Array<string>): boolean {
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
