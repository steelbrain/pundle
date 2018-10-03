// @flow

import * as t from '@babel/types'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import pluginStripFlowTypes from '@babel/plugin-transform-flow-strip-types'
import pluginCommonJSModules from '@babel/plugin-transform-modules-commonjs'
import pluginInjectNodeGlobals from 'babel-plugin-inject-node-globals'
import { promisify } from 'util'
import { transform } from '@babel/core'
import { createFileTransformer, getChunk, getUniqueHash } from '@pundle/api'

import { getName, getStringFromLiteralOrTemplate } from './helpers'
import manifest from '../package.json'
import pluginRemoveDeadNodes from './plugin-remove-dead-nodes'
import getPluginReplaceProcess from './plugin-replace-process'

const transformAsync = promisify(transform)

// $FlowFixMe: Flow doesn't like mixing booleans and a string in default parameters
function createComponent({ injectNodeGlobals = 'auto' }: { injectNodeGlobals: true | false | 'auto' } = {}) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 1000,
    async callback({ file, resolve, context, addImport, addChunk }) {
      if (file.format !== 'js') return null

      const { target } = context.config

      const plugins = [getPluginReplaceProcess(target), pluginCommonJSModules, pluginStripFlowTypes]
      const promises = []

      if ((injectNodeGlobals === 'auto' && target === 'browser') || injectNodeGlobals === true) {
        plugins.push(pluginInjectNodeGlobals)
      }

      const { ast } = await transformAsync(typeof file.contents === 'string' ? file.contents : file.contents.toString(), {
        ast: true,
        code: false,
        babelrc: false,
        configFile: false,
        sourceMaps: false,
        filename: file.filePath,
        highlightCode: false,
        plugins,
        sourceType: 'unambiguous',
        parserOpts: {
          plugins: ['dynamicImport', 'flow'],
        },
      })

      traverse(ast, {
        ...pluginRemoveDeadNodes,
        CallExpression(path) {
          const { node } = path
          const { callee } = node
          const [givenArg] = node.arguments

          const arg = getStringFromLiteralOrTemplate(givenArg)
          if (!arg) return

          if (t.isImport(callee)) {
            promises.push(
              resolve(arg.value.raw || arg.value, arg.loc).then(givenResolved => {
                if (givenResolved.filePath === false) return null
                const resolved = { ...givenResolved, format: 'js' }

                const chunk = getChunk(resolved.format, null, resolved.filePath, [], false)
                node.callee = t.memberExpression(t.identifier('require'), t.identifier('chunk'))
                node.arguments = [t.stringLiteral(context.getPublicPath(chunk)), t.stringLiteral(getUniqueHash(resolved))]
                return addChunk(chunk)
              }),
            )
            return
          }

          const calleeName = getName(callee, ['require'], 2)
          if (!['require', 'require.resolve'].includes(calleeName) || path.scope.hasBinding('require')) {
            return
          }

          const specified = path.parent && !t.isExpressionStatement(path.parent)

          // Handling require + require.resolve
          promises.push(
            resolve(arg.value.raw || arg.value, arg.loc, specified)
              .then(givenResolved => {
                if (givenResolved.filePath === false) return null
                const resolved = { ...givenResolved, format: 'js' }

                node.arguments = [t.stringLiteral(getUniqueHash(resolved))]
                return addImport(resolved)
              })
              .catch(error => {
                let foundTry = false
                let parent = path
                do {
                  if (t.isTryStatement(parent.node)) {
                    foundTry = true
                    break
                  }
                  parent = parent.parentPath
                } while (parent)

                if (!foundTry) {
                  throw error
                }
              }),
          )
        },
      })

      await Promise.all(promises)

      const generated = generate(ast, {
        sourceMaps: true,
        sourceFileName: file.filePath,
      })

      return {
        contents: generated.code,
        sourceMap: generated.map,
      }
    },
  })
}

module.exports = createComponent
