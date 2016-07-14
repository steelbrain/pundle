/* @flow */

import Path from 'path'
import generate from 'babel-generator'
import * as t from 'babel-types'
import { parse } from 'babylon'
import { getName, traverse } from './helpers'
import type Pundle from '../../'
import type { LoaderResult } from '../../types'

export default async function processJavascript(pundle: Pundle, filePath: string, source: string): Promise<LoaderResult> {
  // TODO: Check for `process` or `Buffer` variable access here and then import the modules if necessary
  const imports = new Set()
  const promises = []

  const ast = parse(source, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'flow',
      'asyncFunctions',
      'decorators',
      'classProperties'
    ],
    filename: filePath
  })

  traverse(ast, function(node) {
    if (!node) {
      return false
    }

    if (node.type === 'CallExpression') {
      const name = getName(node.callee)
      if (name === 'require' || name === 'require.resolve') {
        if (name === 'require') {
          node.callee.name = '__require'
        } else {
          node.callee.object.name = '__require'
        }
        const argument = node.arguments[0]
        if (argument && argument.value) {
          promises.push(pundle.resolver.resolve(argument.value, filePath).then(function(resolved) {
            const resolvedFilePath = pundle.path.in(resolved)
            argument.value = resolvedFilePath
            imports.add(resolvedFilePath)
          }))
        }
      }
    } else if (node.type === 'ImportDeclaration') {
      promises.push(pundle.resolver.resolve(node.source.value, filePath).then(function(resolved) {
        const resolvedFilePath = pundle.path.in(resolved)
        node.source.value = resolvedFilePath
        imports.add(resolvedFilePath)
      }))
    } else if (node.type === 'MemberExpression') {
      const name = getName(node)
      if (pundle.config.replaceVariables[name]) {
        return pundle.config.replaceVariables[name]
      }
    }
    return false
  })

  await Promise.all(promises)
  ast.program.body.unshift(
    t.variableDeclaration('var', [
      t.variableDeclarator(t.identifier('__dirname'), t.stringLiteral(Path.dirname(filePath))),
      t.variableDeclarator(t.identifier('__filename'), t.stringLiteral(filePath)),
      t.variableDeclarator(t.identifier('__require'), t.callExpression(t.identifier('__sb_generate_require'), [
        t.stringLiteral(filePath)
      ]))
    ])
  )

  const compiled = generate(ast, {
    compact: true,
    quotes: 'single',
    comments: false,
    filename: filePath,
    sourceMaps: true,
    sourceFileName: filePath
  })

  return {
    imports,
    contents: compiled.code,
    sourceMap: compiled.map,
  }
}
