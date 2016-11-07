/* @flow */

import Path from 'path'
import generate from 'babel-generator'
import { parse } from 'babylon'
import { createLoader, shouldProcess, FileError, MessageError } from 'pundle-api'
import type { File } from 'pundle-api/types'

import { traverse, getName, getParsedReplacements } from './helpers'

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
    const errorMessage = `${error.message} in ${Path.relative(this.config.rootDirectory, file.filePath)}`
    if (error.loc) {
      throw new FileError(file.contents, error.loc.line, error.loc.column + 1, errorMessage, 'error')
    } else {
      throw new MessageError(errorMessage, 'error')
    }
  }

  const replaceVariables = getParsedReplacements(Object.assign({}, this.config.replaceVariables))

  traverse(ast, node => {
    if (!node) {
      return false
    }

    let name
    if (node.type === 'CallExpression') {
      name = getName(node.callee)
      const parameter = node.arguments[0]
      if ((name === 'require.resolve' || name === 'require' || name === 'module.hot.accept') && node.arguments.length === 1 && parameter.value) {
        const request = this.getImportRequest(parameter.value, file.filePath)
        imports.add(request)
        parameter.value = request.id
      }
    }
    if (node.type === 'ImportDeclaration') {
      const request = this.getImportRequest(node.source.value, file.filePath)
      imports.add(request)
      node.source.value = request.id
    }
    if (node.type === 'MemberExpression' || node.type === 'Identifier') {
      name = getName(node)
      if (replaceVariables[name]) {
        return replaceVariables[name]
      }
    }
    return false
  })

  const compiled = generate(ast, {
    concise: true,
    quotes: 'single',
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
