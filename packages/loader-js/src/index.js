/* @flow */

import { parse } from 'babylon'
import traverse from 'babel-traverse'
import generate from 'babel-generator'
import { createLoader, shouldProcess, getRelativeFilePath, FileIssue, MessageIssue } from 'pundle-api'
import type { File } from 'pundle-api/types'

import { getName, getParsedReplacement } from './helpers'

const RESOLVE_NAMES = new Set([
  'require',
  'require.resolve',
  'module.hot.accept',
  'module.hot.decline',
])
const RESOLVE_NAMES_SENSITIVE = new Set([
  'require',
  'require.resolve',
])

export default createLoader(function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }
  const imports = new Set()

  let ast
  try {
    ast = parse(file.contents, {
      sourceType: 'module',
      sourceFilename: file.filePath,
      plugins: [
        'jsx',
        'flow',
        'doExpressions',
        'objectRestSpread',
        'decorators',
        'classProperties',
        'exportExtensions',
        'asyncGenerators',
        'functionBind',
        'functionSent',
        'dynamicImport',
      ],
    })
  } catch (error) {
    const errorMessage = `${error.message} in ${getRelativeFilePath(file.filePath, this.config.rootDirectory)}`
    if (error.loc) {
      throw new FileIssue(file.contents, error.loc.line, error.loc.column + 1, errorMessage, 'error')
    } else {
      throw new MessageIssue(errorMessage, 'error')
    }
  }

  const processResolve = node => {
    if (typeof node.value === 'string') {
      // StringLiteral
      const request = this.getImportRequest(node.value, file.filePath)
      imports.add(request)
      // NOTE: Casting it to string is VERY important and required
      node.value = request.id.toString()
    }
  }
  const processReplaceable = path => {
    const name = getName(path.node)
    if ({}.hasOwnProperty.call(this.config.replaceVariables, name)) {
      path.replaceWith(getParsedReplacement(this.config.replaceVariables[name]))
    }
  }
  traverse(ast, {
    ImportDeclaration(path) {
      processResolve(path.node.source)
    },
    CallExpression(path) {
      const name = getName(path.node.callee)
      if (!RESOLVE_NAMES.has(name)) {
        return
      }
      const parameter = path.node.arguments && path.node.arguments[0]
      if (!parameter || typeof parameter.value !== 'string') {
        return
      }
      if (RESOLVE_NAMES_SENSITIVE.has(name) && path.scope.hasBinding('require')) {
        return
      }
      processResolve(parameter)
    },
    Identifier: processReplaceable,
    MemberExpression: processReplaceable,
  })

  const compiled = generate(ast, {
    quotes: 'single',
    compact: true,
    comments: false,
    filename: file.filePath,
    sourceMaps: true,
    sourceFileName: file.filePath,
  })

  return {
    imports,
    contents: compiled.code,
    sourceMap: compiled.map,
  }
}, {
  extensions: ['js', 'jsx'],
})
