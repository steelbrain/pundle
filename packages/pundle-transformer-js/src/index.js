// @flow

import * as t from '@babel/types'
import invariant from 'assert'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import { promisify } from 'util'
import { transform } from '@babel/core'
import { createFileTransformer, getChunk, getUniqueHash } from 'pundle-api'

import { getName } from './helpers'
import manifest from '../package.json'
import pluginRemoveDeadNodes from './plugin-remove-dead-nodes'
import getPluginReplaceProcess from './plugin-replace-process'

const INJECTIONS = new Map([['timers', ['setImmediate', 'clearImmediate']], ['buffer', ['Buffer']], ['process', 'process']])
const INJECTIONS_NAMES = new Map()
INJECTIONS.forEach(function(names, sourceModule) {
  ;[].concat(names).forEach(function(name) {
    INJECTIONS_NAMES.set(name, sourceModule)
  })
})

const transformAsync = promisify(transform)

function createComponent({ browser, env = {} }: { browser: boolean, env?: { [string]: string } }) {
  return createFileTransformer({
    name: 'pundle-transformer-js',
    version: manifest.version,
    priority: 1000,
    async callback({ file, resolve, context, addImport, addChunk }) {
      if (file.format !== 'js') return null

      const promises = []
      const injectionNames = new Set()
      const { ast } = await transformAsync(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        ast: true,
        code: false,
        babelrc: false,
        configFile: false,
        sourceMaps: false,
        filename: file.filePath,
        highlightCode: false,
        plugins: [getPluginReplaceProcess(browser, env)],
        sourceType: 'module',
        parserOpts: {
          plugins: ['dynamicImport'],
        },
      })

      traverse(ast, {
        ...pluginRemoveDeadNodes,
        ImportDeclaration({ node }) {
          const { source } = node
          if (!t.isStringLiteral(source)) return
          promises.push(
            resolve(source.value, source.loc).then(({ filePath }) => {
              const resolved = { filePath, format: 'js' }

              source.value = getUniqueHash(resolved)
              return addImport(resolved)
            }),
          )
        },
        // TODO: Support module.hot.accept etc in resolutions
        CallExpression(path) {
          const { node } = path
          const { callee } = node
          const [arg] = node.arguments

          if (!t.isStringLiteral(arg)) return

          if (t.isImport(callee)) {
            promises.push(
              resolve(arg.value, arg.loc).then(({ filePath }) => {
                const resolved = { filePath, format: 'js' }

                const chunk = getChunk(resolved.format, null, resolved.filePath, [], false)
                node.callee = t.memberExpression(t.identifier('require'), t.identifier('chunk'))
                arg.value = context.getPublicPath(chunk)
                node.arguments.splice(1, 0, t.stringLiteral(getUniqueHash(resolved)))
                return addChunk(chunk)
              }),
            )
            return
          }

          const calleeName = getName(callee, ['require'], 2)
          if (!['require', 'require.resolve'].includes(calleeName) || path.scope.hasBinding('require')) {
            return
          }

          // Handling require + require.resolve
          promises.push(
            resolve(arg.value, arg.loc).then(({ filePath }) => {
              const resolved = { filePath, format: 'js' }

              arg.value = getUniqueHash(resolved)
              return addImport(resolved)
            }),
          )
        },
        ...(browser
          ? {
              Identifier(path) {
                const { node } = path
                if (
                  INJECTIONS_NAMES.has(node.name) &&
                  !injectionNames.has(node.name) &&
                  path.isReferencedIdentifier() &&
                  !path.scope.hasBinding(node.name)
                ) {
                  injectionNames.add(node.name)
                }
              },
            }
          : {}),
      })

      const injectionImports = new Map()
      injectionNames.forEach(item => {
        const sourceModule = INJECTIONS_NAMES.get(item)
        invariant(sourceModule, 'sourceModule for Injection was not found?')
        promises.push(
          resolve(sourceModule).then(resolved => {
            injectionImports.set(sourceModule, getUniqueHash(resolved))
            return addImport(resolved)
          }),
        )
      })

      await Promise.all(promises)

      if (injectionImports.size) {
        const wrapper = t.callExpression(t.functionExpression(null, [], t.blockStatement([])), [])
        injectionImports.forEach((resolved, importName) => {
          wrapper.arguments.push(t.callExpression(t.identifier('require'), [t.stringLiteral(resolved)]))
          let names = INJECTIONS.get(importName)
          if (typeof names === 'string') {
            wrapper.callee.params.push(t.identifier(names))
          } else if (Array.isArray(names)) {
            names = names.filter(item => injectionNames.has(item))
            const refName = `__$sb$pundle${importName}`
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

      const generated = generate(ast, {
        sourceMaps: true,
        sourceFileName: file.filePath,
      })

      return {
        contents: generated.code,
        sourceMap: JSON.stringify(generated.map),
      }
    },
  })
}

module.exports = createComponent
