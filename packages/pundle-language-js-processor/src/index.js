// @flow

import * as t from 'babel-types'
import invariant from 'assert'
import traverse from 'babel-traverse'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageProcessor } from 'pundle-api/lib/types'

import { version } from '../package.json'

// const NAMES_DEPENDENCY_TIMER = ['setImmediate', 'clearImmediate']
// const NAMES_DEPENDENCY_BUFFER = ['Buffer']
// const NAMES_DEPENDENCY_BROWSER = ['browser']
// const NAMES_DEPENDENCY_GLOBALS = ['global']

export default function() {
  return registerComponent({
    name: 'pundle-language-js-processor',
    version,
    hookName: 'language-process',
    callback: (async function(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return
      }
      const promises = []
      const parsed = file.parsed
      invariant(parsed, 'file.parsed is null, is the parser working?!')
      traverse(parsed.ast, {
        ImportDeclaration({ node }) {
          const source = node.source
          if (t.isStringLiteral(source)) {
            promises.push(
              context
                .resolveSimple(source.value, file.filePath, node.loc.start.line, node.loc.start.column)
                .then(resolved => {
                  source.value = resolved
                  file.imports.push(resolved)
                }),
            )
          }
        },
        CallExpression(path) {
          const { node } = path
          const { callee } = node
          const [arg] = node.arguments

          if (!t.isStringLiteral(arg)) return

          if (t.isImport(callee)) {
            // Chunky async Import
            promises.push(
              context.resolveSimple(arg.value, file.filePath, node.loc.start.line, node.loc.start.column).then(resolved => {
                arg.value = resolved
                file.chunks.push(context.getChunk(resolved))
              }),
            )
            return
          }
          // require + require.resolve handling below
          const isRequire = t.isIdentifier(callee) && callee.name === 'require'
          const isRequireResolve =
            t.isMemberExpression(callee) && callee.object.name === 'require' && callee.property.name === 'resolve'
          if (isRequire || isRequireResolve) {
            if (path.scope.hasBinding('require')) return
            promises.push(
              context.resolveSimple(arg.value, file.filePath, node.loc.start.line, node.loc.start.column).then(resolved => {
                arg.value = resolved
                if (isRequire) {
                  file.imports.push(resolved)
                }
              }),
            )
          }
        },
        // Identifier(path) {},
        // MemberExpression(path) {},
      })

      await Promise.all(promises)
    }: ComponentLanguageProcessor),
    defaultOptions: {
      extensions: ['.js'],
    },
  })
}
