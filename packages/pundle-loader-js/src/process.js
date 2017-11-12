// @flow

import * as t from 'babel-types'
import traverse from 'babel-traverse'
import { shouldProcess, type Context, type File } from 'pundle-api'

import { getName, getParsedReplacement } from './helpers'

const INJECTIONS = {
  timers: ['setImmediate', 'clearImmediate'],
  buffer: ['Buffer'],
  process: 'process',
}

export default async function callback(context: Context, options: Object, file: File, ast: Object) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
    return
  }
  const replaceVariables = {
    'process.env.browser': context.config.target === 'browser',
    'process.env.BROWSER': context.config.target === 'browser',
    ...options.replaceVariables,
  }

  const promises = []

  const injections: Map<string, any> = new Map()
  const resolveNode = (request: string, node: Object) =>
    context.resolveSimple(request, file.filePath, node.loc.start.line, node.loc.start.column)
  const processReplaceable = path => {
    const name = getName(path.node)
    if ({}.hasOwnProperty.call(replaceVariables, name)) {
      path.replaceWith(getParsedReplacement(replaceVariables[name]))
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
            file.addImport(resolved)
          }),
        )
      })
    }
  }

  traverse(ast, {
    ImportDeclaration({ node }) {
      const source = node.source
      if (t.isStringLiteral(source)) {
        promises.push(
          resolveNode(source.value, node).then(resolved => {
            source.value = resolved
            file.addImport(resolved)
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
            node.callee = t.memberExpression(t.identifier('require'), t.identifier('import'))
            arg.value = resolved
            file.addChunk(context.getChunk(resolved))
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
              file.addImport(resolved)
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
      if (typeof names === 'string') {
        wrapper.callee.params.push(t.identifier(names))
      } else {
        const refName = `__$sb$pundle${key}`
        wrapper.callee.params.push(t.identifier(refName))
        ast.program.body = [
          t.variableDeclaration(
            'var',
            names.map(name =>
              t.variableDeclarator(t.identifier(name), t.memberExpression(t.identifier(refName), t.identifier(name))),
            ),
          ),
        ].concat(ast.program.body)
      }
    })
    wrapper.callee.body.body = ast.program.body
    wrapper.callee.body.directives = ast.program.directives
    ast.program.body = [t.expressionStatement(wrapper)]
    ast.program.directives = []
  }
}
