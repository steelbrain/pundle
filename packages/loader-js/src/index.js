/* @flow */

import { parse } from 'babylon'
import traverse from 'babel-traverse'
import generate from 'babel-generator'
import { createLoader, shouldProcess, getRelativeFilePath, FileIssue, MessageIssue } from 'pundle-api'
import type { Context, File, FileImport, FileChunk, LoaderResult } from 'pundle-api/types'

import * as Helpers from './helpers'

const RESOLVE_NAMES = new Set([
  'require',
  'require.ensure',
  'require.resolve',
  'module.hot.accept',
  'module.hot.decline',
])
const RESOLVE_NAMES_SENSITIVE = new Set([
  'require',
  'require.resolve',
])

export default createLoader(function(context: Context, config: Object, file: File): ?LoaderResult {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  const chunks: Array<FileChunk> = []
  const imports: Array<FileImport> = []

  let ast
  try {
    ast = parse(file.contents, {
      sourceType: 'module',
      sourceFilename: file.filePath,
      plugins: ['jsx', 'flow', '*'],
    })
  } catch (error) {
    const errorMessage = `${error.message} in ${getRelativeFilePath(file.filePath, context.config.rootDirectory)}`
    if (error.loc) {
      throw new FileIssue(file.filePath, file.contents, error.loc.line, error.loc.column + 1, errorMessage, 'error')
    } else {
      throw new MessageIssue(errorMessage, 'error')
    }
  }

  const processResolve = (node) => {
    const request = context.getImportRequest(node.value, file.filePath)
    imports.push(request)
    node.value = request.id.toString()
    // NOTE: ^ Casting it to string is VERY VERY important, it breaks everything otherwise
  }
  const processReplaceable = (path) => {
    const name = Helpers.getName(path.node)
    if ({}.hasOwnProperty.call(context.config.replaceVariables, name)) {
      path.replaceWith(Helpers.getParsedReplacement(context.config.replaceVariables[name]))
    }
  }
  traverse(ast, {
    ImportDeclaration: (path) => {
      processResolve(path.node.source)
    },
    CallExpression: (path) => {
      if (path.node.callee.type === 'Import') {
        Helpers.processImport(context, file, chunks, path)
        return
      }
      const name = Helpers.getName(path.node.callee)
      if (!RESOLVE_NAMES.has(name)) {
        return
      }
      const parameter = path.node.arguments && path.node.arguments[0]
      if (!parameter || parameter.type !== (name === 'require.ensure' ? 'ArrayExpression' : 'StringLiteral')) {
        return
      }
      if (RESOLVE_NAMES_SENSITIVE.has(name) && path.scope.hasBinding('require')) {
        return
      }
      if (name === 'require.ensure') {
        Helpers.processEnsure(context, file, chunks, path)
      } else {
        processResolve(parameter)
      }
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
    chunks,
    imports,
    contents: compiled.code,
    sourceMap: compiled.map,
  }
}, {
  extensions: ['js', 'jsx'],
})
