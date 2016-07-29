/* @flow */

import generate from 'babel-generator'
import * as t from 'babel-types'
import { parse } from 'babylon'
import { mergeSourceMaps } from '../helpers'
import { resolveRealPathOfError, getName, traverse } from './helpers'
import type Pundle from '../../'
import type { LoaderResult } from '../../types'

export default async function processJavascript(pundle: Pundle, filePath: string, source: string, sourceMap: ?Object): Promise<LoaderResult> {
  const imports = new Set()
  const promises = []

  let ast
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'flow',
        'asyncFunctions',
        'classConstructorCall',
        'doExpressions',
        'trailingFunctionCommas',
        'objectRestSpread',
        'decorators',
        'classProperties',
        'exportExtensions',
        'exponentiationOperator',
        'asyncGenerators',
        'functionBind',
        'functionSent',
      ],
      filename: filePath,
    })
  } catch (error) {
    if (error && error.constructor.name === 'SyntaxError') {
      error.message = `${error.message} at ${filePath}`
    }
    throw error
  }

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
            argument.value = pundle.getUniquePathID(resolvedFilePath)
            imports.add(resolvedFilePath)
          }, function(error) {
            throw resolveRealPathOfError(error, node, sourceMap)
          }))
        }
      }
    } else if (node.type === 'ImportDeclaration') {
      promises.push(pundle.resolver.resolve(node.source.value, filePath).then(function(resolved) {
        const resolvedFilePath = pundle.path.in(resolved)
        node.source.value = pundle.getUniquePathID(resolvedFilePath)
        imports.add(resolvedFilePath)
      }, function(error) {
        throw resolveRealPathOfError(error, node, sourceMap)
      }))
    } else if (node.type === 'MemberExpression') {
      const name = getName(node)
      const value = pundle.config.replaceVariables[name]
      if (typeof value === 'string') {
        return t.stringLiteral(value)
      } else if (typeof value === 'number' && value < Infinity && !Number.isNaN(value)) {
        return t.numericLiteral(value)
      } else if (typeof value !== 'undefined') {
        throw new Error(`Unknown replacement value for '${name}'`)
      }
    }
    return false
  })

  await Promise.all(promises)
  ast.program.body.unshift(
    t.variableDeclaration('var', [
      t.variableDeclarator(t.identifier('__dirname'), t.stringLiteral('')),
      t.variableDeclarator(t.identifier('__filename'), t.stringLiteral(pundle.getUniquePathID(filePath))),
      t.variableDeclarator(t.identifier('__require'), t.callExpression(t.identifier('__sb_generate_require'), [
        t.identifier('__filename'),
      ])),
    ])
  )

  const compiled = generate(ast, {
    compact: true,
    quotes: 'single',
    comments: false,
    filename: filePath,
    sourceMaps: true,
    sourceFileName: filePath,
  })
  if (sourceMap) {
    compiled.map = mergeSourceMaps(sourceMap, compiled.map)
  }

  return {
    imports,
    contents: compiled.code,
    sourceMap: compiled.map,
  }
}
