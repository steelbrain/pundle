// @flow

import * as t from 'babel-types'
import invariant from 'assert'
import traverse from 'babel-traverse'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageProcessor } from 'pundle-api/lib/types'

import { version } from '../package.json'
import { getName, getInjectionName, getParsedReplacement } from './helpers'

type Injection = 'timers' | 'buffer' | 'process' | 'global'
const INJECTIONS: Array<{ key: Injection, names: Set<string> }> = [
  { key: 'timers', names: new Set(['setImmediate', 'clearImmediate']) },
  { key: 'buffer', names: new Set(['Buffer']) },
  { key: 'process', names: new Set(['process']) },
  { key: 'global', names: new Set(['global']) },
]

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

      const injections: Map<Injection, string> = new Map()
      const resolveNode = (request: string, node: Object) =>
        context.resolveSimple(request, file.filePath, node.loc.start.line, node.loc.start.column)
      const processReplaceable = path => {
        const name = getName(path.node)
        if ({}.hasOwnProperty.call(options.replaceVariables, name)) {
          path.replaceWith(getParsedReplacement(options.replaceVariables[name]))
          return
        }
        if (context.config.target === 'browser') {
          INJECTIONS.forEach(({ key, names }) => {
            if (names.has(name) && !injections.has(key) && !path.scope.hasBinding(name)) {
              // $FlowIgnore: It's temporary
              injections.set(key, null)
              promises.push(
                resolveNode(key, path.node).then(resolved => {
                  injections.set(key, resolved)
                  file.imports.push(resolved)
                }),
              )
            }
          })
        }
      }

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
      if (injections.size) {
        const resolvedParams = Array.from(injections.values()).map(resolved => t.stringLiteral(resolved))
        const functionArgs = Array.from(injections.keys()).map(name => t.identifier(getInjectionName(name)))
        const wrapper = t.callExpression(
          t.functionExpression(null, functionArgs, t.blockStatement([])),
          Array.from(resolvedParams),
        )
        if (injections.has('timers')) {
          parsed.ast.program.body.unshift(
            t.variableDeclaration('var', [
              t.variableDeclarator(
                t.identifier('setImmediate'),
                t.memberExpression(t.identifier(getInjectionName('timers')), t.identifier('setImmediate')),
              ),
              t.variableDeclarator(
                t.identifier('clearImmediate'),
                t.memberExpression(t.identifier(getInjectionName('timers')), t.identifier('clearImmediate')),
              ),
            ]),
          )
        }
        wrapper.callee.body.body = parsed.ast.program.body
        wrapper.callee.body.directives = parsed.ast.program.directives
        parsed.ast.program.body = [wrapper]
        parsed.ast.program.directives = []
      }
    }: ComponentLanguageProcessor),
    defaultOptions: {
      extensions: ['.js'],
      replaceVariables: {},
    },
  })
}
