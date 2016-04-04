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
  contents: string,
  sourceMap: ?Object,
  pundle: Pundle
): Promise<{
  imports: Array<string>,
  contents: string,
  sourceMap: Object
}> {
  const imports = []
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
  traverse(ast, {
    CallExpression(path) {
      if (path.node.callee.name === 'require') {
        const argument = path.node.arguments[0]
        if (argument && argument.value) {
          promises.push(pundle.path.resolveModule(argument.value, Path.dirname(filePath)).then(function(resolved) {
            argument.value = resolved
            imports.push(resolved)
          }))
        }
      }
    },
    ImportDeclaration(path) {
      promises.push(pundle.path.resolveModule(path.node.source.value, Path.dirname(filePath)).then(function(resolved) {
        path.node.source.value = resolved
        imports.push(resolved)
      }))
    }
  })

  await Promise.all(promises)
  const generated = generate(ast, {
    quotes: 'single',
    filename: filePath
  }, {
    [filePath]: contents
  })
  if (sourceMap) {
    generated.map = mergeSourceMaps(sourceMap, generated.map)
  }

  return {
    imports,
    contents: generated.code,
    sourceMap: generated.map
  }
}
