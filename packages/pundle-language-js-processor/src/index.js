// @flow

import * as t from 'babel-types'
import invariant from 'assert'
import traverse from 'babel-traverse'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageProcessor } from 'pundle-api/lib/types'

import { version } from '../package.json'

// TODO: Should we bundle the require resolved ones in output? I think yes
// const NAMES_RESOLVE_REQUIRE = ['require', 'require.resolve']
// const NAMES_RESOLVE_MODULE = ['module.hot.accept', 'module.hot.decline']
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
        CallExpression({ node }) {
          if (node.callee.type === 'Import') {
            // Chunky async Import
            const [arg] = node.arguments
            if (t.isStringLiteral(arg)) {
              promises.push(
                context
                  .resolveSimple(arg.value, file.filePath, node.loc.start.line, node.loc.start.column)
                  .then(resolved => {
                    arg.value = resolved
                    file.chunks.push(context.getChunk(resolved))
                  }),
              )
            }
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
