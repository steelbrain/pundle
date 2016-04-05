'use strict'

/* @flow */

import Path from 'path'
import generate from 'babel-generator'
import traverse from 'babel-traverse'
import { parse } from 'babylon'
import { mergeSourceMaps } from '../helpers'
import type Pundle from '../index.js'

export default async function transform(
  filePath: string,
  pundle: Pundle,
  { contents, sourceMap }: { contents: string, sourceMap: ?Object }
): Promise<{
  imports: Array<string>,
  contents: string,
  sourceMap: Object
}> {
  const imports = new Set()
  const promises = []
  const ast = parse(contents, {
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
  traverse.cheap(ast, function(node) {
    if (node.type === 'CallExpression') {
      if (node.callee.name === 'require') {
        const argument = node.arguments[0]
        if (argument && argument.value) {
          promises.push(pundle.path.resolveModule(argument.value, Path.dirname(filePath)).then(function(resolved) {
            argument.value = resolved
            imports.add(resolved)
          }))
        }
      }
    } else if (node.type === 'ImportDeclaration') {
      promises.push(pundle.path.resolveModule(node.source.value, Path.dirname(filePath)).then(function(resolved) {
        node.source.value = resolved
        imports.add(resolved)
      }))
    }
  })

  await Promise.all(promises)
  const generated = generate(ast, {
    quotes: 'single',
    filename: filePath,
    sourceMaps: true,
    sourceFileName: filePath
  })
  if (sourceMap) {
    generated.map = mergeSourceMaps(sourceMap, generated.map)
  }

  return {
    imports: Array.from(imports),
    contents: generated.code,
    sourceMap: generated.map
  }
}
