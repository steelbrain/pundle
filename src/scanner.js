'use strict'

/* @flow */

import { parse } from 'babylon'
import traverse from 'babel-traverse'

export default function scanImports(content: string): Array<string> {
  const ast = parse(content, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'flow',
      'asyncFunctions',
      'classProperties'
    ]
  })
  const imports = []
  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.name === 'require') {
        const argument = path.node.arguments[0]
        if (argument) {
          imports.push(argument.value)
        }
      }
    },
    ImportDeclaration(path) {
      imports.push(path.node.source.extra.rawValue)
    }
  })
  return imports
}
