/* @flow */

import { parse } from 'babylon'
import traverse from 'babel-traverse'
import generate from 'babel-generator'
import { createLoader, shouldProcess, getRelativeFilePath, FileIssue, MessageIssue } from 'pundle-api'
import type { File, FileImport, FileChunk, LoaderResult } from 'pundle-api/types'

import { getName, getParsedReplacement } from './helpers'

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
const UNIQUE_CHUNK_KEY = '__$sb_pundle_context_chunk'

export default createLoader(function(config: Object, file: File): ?LoaderResult {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  const chunks: Array<FileChunk> = []
  const imports: Array<FileImport> = []

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

  const processSplit = node => {
    const chunkName = node.arguments[2] && node.arguments[2].type === 'StringLiteral' ? node.arguments[2].value : this.getNextUniqueID().toString()
    const entryPoints = node.arguments[0].elements.map(arg => arg.value)
    const chunk = chunks.filter(c => c.name === chunkName)[0] || {
      name: chunkName,
      entry: entryPoints,
      imports: [],
    }
    node[UNIQUE_CHUNK_KEY] = chunk
    if (chunks.indexOf(chunk) === -1) {
      chunks.push(chunk)
    }
  }
  const processResolve = node => {
    const request = this.getImportRequest(node.value, file.filePath)
    imports.push(request)
    node.value = request.id.toString()
    // NOTE: ^ Casting it to string is VERY VERY important, it breaks everything otherwise
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
      if (!parameter || parameter.type !== (name === 'require.ensure' ? 'ArrayExpression' : 'StringLiteral')) {
        return
      }
      if (RESOLVE_NAMES_SENSITIVE.has(name) && path.scope.hasBinding('require')) {
        return
      }
      if (name === 'require.ensure') {
        processSplit(path.node)
      } else {
        const chunk: ?FileChunk = path.findParent(parentPath => parentPath.node[UNIQUE_CHUNK_KEY])
        if (chunk) {
          const request = this.getImportRequest(parameter.value, file.filePath)
          chunk.imports.push(request)
          parameter.value = request.id.toString()
        } else {
          processResolve(parameter)
        }
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
