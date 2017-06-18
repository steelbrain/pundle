/* @flow */

import { parse } from 'babylon'
import traverse from 'babel-traverse'
import generate from 'babel-generator'
import { FILE_FEATURES, createLoader, shouldProcess, FileIssue, FileMessageIssue } from 'pundle-api'
import type { Context, File, FileImport, FileChunk, LoaderResult } from 'pundle-api/types'

import * as Helpers from './helpers'

const RESOLVE_NAMES = new Set([
  'require',
  'require.ensure',
  'require.resolve',
  'module.hot.accept',
  'module.hot.decline',
])
const REQUIRE_NAMES = new Set([
  'require',
  'require.resolve',
])

export default createLoader(async function(context: Context, config: Object, file: File): Promise<?LoaderResult> {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  const chunks: Array<FileChunk> = []
  const imports: Array<FileImport> = []

  let ast
  try {
    ast = parse(file.getContents(), {
      sourceType: 'module',
      sourceFilename: file.filePath,
      plugins: ['jsx', 'flow', '*'],
    })
  } catch (error) {
    if (error.loc) {
      throw new FileIssue(file.getFilePath(), file.getContents(), error.loc.line, error.loc.column, error.message, 'error')
    } else {
      throw new FileMessageIssue(file.getFilePath(), error.message)
    }
  }

  const processResolve = (node) => {
    const request = context.getImportRequest(node.value, file.filePath, node.loc)
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
    ImportDeclaration(path) {
      processResolve(path.node.source)
      file.useFeature(FILE_FEATURES.ES_IMPORT)
    },
    ExportDeclaration() {
      file.useFeature(FILE_FEATURES.ES_EXPORT)
    },
    CallExpression(path) {
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
      if (REQUIRE_NAMES.has(name)) {
        if (path.scope.hasBinding('require')) {
          return
        }
        file.useFeature(FILE_FEATURES.CJS_IMPORT)
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
