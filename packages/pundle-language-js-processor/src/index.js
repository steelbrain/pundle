// @flow

import * as t from 'babel-types'
import invariant from 'assert'
import traverse from 'babel-traverse'
import { shouldProcess, registerComponent } from 'pundle-api'
import type { ComponentLanguageProcessor } from 'pundle-api/lib/types'

import { version } from '../package.json'
import { getName, getParsedReplacement } from './helpers'

const INJECTIONS = {
  timers: ['setImmediate', 'clearImmediate'],
  buffer: ['Buffer'],
  process: ['process'],
  global: ['global'],
}

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

      const injections: Map<string, any> = new Map()
      const resolveNode = (request: string, node: Object) =>
        context.resolveSimple(request, file.filePath, node.loc.start.line, node.loc.start.column)
      const processReplaceable = path => {
        const name = getName(path.node)
        if ({}.hasOwnProperty.call(options.replaceVariables, name)) {
          path.replaceWith(getParsedReplacement(options.replaceVariables[name]))
          return
        }
        if (context.config.target === 'browser') {
          Object.keys(INJECTIONS).forEach(key => {
            const names = INJECTIONS[key]
            if (!names.includes(name) || injections.has(key) || path.scope.hasBinding(name)) return
            injections.set(key, null)
            promises.push(
              resolveNode(key, path.node).then(resolved => {
                injections.set(key, resolved)
                file.imports.push(resolved)
              }),
            )
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
        const wrapper = t.callExpression(t.functionExpression(null, [], t.blockStatement([])), [])
        injections.forEach((resolved, key) => {
          wrapper.arguments.push(t.callExpression(t.identifier('require'), [t.stringLiteral(resolved)]))
          const names = INJECTIONS[key]
          if (names.length === 1) {
            wrapper.callee.params.push(t.identifier(names[0]))
          } else {
            const refName = `__$sb$pundle${key}`
            wrapper.callee.params.push(t.identifier(refName))
            parsed.ast.program.body = [
              t.variableDeclaration(
                'var',
                names.map(name =>
                  t.variableDeclarator(t.identifier(name), t.memberExpression(t.identifier(refName), t.identifier(name))),
                ),
              ),
            ].concat(parsed.ast.program.body)
          }
        })
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
