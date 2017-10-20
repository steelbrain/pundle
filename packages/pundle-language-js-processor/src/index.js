// @flow

import * as t from 'babel-types'
import invariant from 'assert'
import traverse from 'babel-traverse'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageProcessor } from 'pundle-api/lib/types'

import { version } from '../package.json'
import { getName, getParsedReplacement } from './helpers'

type Injection = 'timers' | 'buffer' | 'process' | 'global'
const INJECTIONS: Array<{ key: Injection, names: Set<string> }> = [
  { key: 'timers', names: new Set(['setImmediate', 'clearImmediate']) },
  { key: 'buffer', names: new Set(['Buffer']) },
  { key: 'process', names: new Set(['process']) },
  { key: 'global', names: new Set(['global']) },
]

export default function() {
  console.log('registering processor')
  return registerComponent({
    name: 'pundle-language-js-processor',
    version,
    hookName: 'language-process',
    callback: (async function(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return
      }

      const injections: Set<Injection> = new Set()
      const resolveNode = (request: string, node: Object) =>
        context.resolveSimple(request, file.filePath, node.loc.start.line, node.loc.start.column)
      const processReplaceable = path => {
        const name = getName(path.node)
        if ({}.hasOwnProperty.call(options.replaceVariables, name)) {
          path.replaceWith(getParsedReplacement(options.replaceVariables[name]))
          return
        }
        INJECTIONS.forEach(({ key, names }) => {
          if (names.has(name) && !injections.has(key) && !path.scope.hasBinding(name)) {
            injections.add(key)
          }
        })
      }

      const promises = []
      const parsed = file.parsed
      invariant(parsed, 'file.parsed is null, is the parser working?!')
      traverse(parsed.ast, {
        ImportDeclaration({ node }) {
          const source = node.source
          if (t.isStringLiteral(source)) {
            promises.push(
              resolveNode(source.value, node).then(resolved => {
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
              resolveNode(arg.value, node).then(resolved => {
                arg.value = resolved
                file.chunks.push(context.getChunk(resolved))
              }),
            )
            return
          }
          const calleeName = getName(callee)
          // require + require.resolve handling below
          if (calleeName === 'require' || calleeName === 'require.resolve') {
            if (path.scope.hasBinding('require')) return
            promises.push(
              resolveNode(arg.value, node).then(resolved => {
                arg.value = resolved
                if (calleeName === 'require') {
                  file.imports.push(resolved)
                }
              }),
            )
          }
        },
        Identifier: processReplaceable,
        MemberExpression: processReplaceable,
      })

      await Promise.all(promises)
      // TODO: handle all injections here
    }: ComponentLanguageProcessor),
    defaultOptions: {
      extensions: ['.js'],
      replaceVariables: {},
    },
  })
}
