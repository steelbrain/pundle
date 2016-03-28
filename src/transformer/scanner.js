'use strict'

/* @flow */

import { transform } from 'babel-core'
import { getModulePath } from '../helpers'
import type { Pundle$State } from '../types'

export default function scan(filePath: string, content: string, state: Pundle$State): {
  content: string,
  imports: Array<string>
} {
  const imports = []
  const parsed = transform(content, {
    plugins: [{
      visitor: {
        CallExpression(path) {
          if (path.node.callee.name === 'require') {
            const argument = path.node.arguments[0]
            if (argument) {
              const resolved = getModulePath(argument.value, filePath, state)
              argument.value = resolved
              imports.push(resolved)
            }
          }
        },
        ImportDeclaration(path) {
          const resolved = getModulePath(path.node.source.value, filePath, state)
          path.node.source.value = resolved
          imports.push(resolved)
        }
      }
    }]
  })

  return {
    content: parsed.code,
    imports
  }
}
