/* @flow */

import generate from 'babel-generator'
import { parse } from 'babylon'
import { createLoader, shouldProcess, getRelativeFilePath, FileIssue, MessageIssue } from 'pundle-api'
import type { File } from 'pundle-api/types'

import { traverse, getName, getParsedReplacement } from './helpers'

const RESOLVE_NAMES = new Set([
  'require',
  'require.resolve',
  'module.hot.accept',
  'module.hot.decline',
])
const NODE_TYPES_TO_PROCESS = new Set(['CallExpression', 'ImportDeclaration', 'MemberExpression', 'Identifier'])

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

  const updateNode = (node, filePath) => {
    if (typeof node.value === 'string') {
      // StringLiteral
      const request = this.getImportRequest(filePath, file.filePath)
      imports.add(request)
      node.value = request.id
    }
  }

  traverse(ast, node => {
    if (!node || !NODE_TYPES_TO_PROCESS.has(node.type)) {
      return false
    }

    let name
    if (node.type === 'CallExpression') {
      name = getName(node.callee)
      const parameter = node.arguments && node.arguments[0]
      if (RESOLVE_NAMES.has(name) && parameter) {
        if (parameter.value) {
          // StringLiteral
          updateNode(parameter, parameter.value)
        } else if (parameter.elements) {
          // ArrayExpression
          parameter.elements.forEach(element => updateNode(element, element.value))
        }
      }
    }
    if (node.type === 'ImportDeclaration') {
      updateNode(node.source, node.source.value)
    }
    if (node.type === 'MemberExpression' || node.type === 'Identifier') {
      name = getName(node)
      if ({}.hasOwnProperty.call(this.config.replaceVariables, name)) {
        return getParsedReplacement(this.config.replaceVariables[name])
      }
    }
    return false
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
  include: ['*.js'],
})
