// @flow

import * as t from '@babel/types'
import { parse } from 'babylon'
import generate from '@babel/generator'
import traverse from '@babel/traverse'
import { createFileTransformer, getChunk, getFileImportHash } from 'pundle-api'

import manifest from '../package.json'
import { getName } from './helpers'

// TODO: have a config?
// TODO: Inject setImmediate etc
export default function() {
  return createFileTransformer({
    name: 'pundle-transformer-commonjs',
    version: manifest.version,
    async callback({ filePath, format, contents, isBuffer }, { resolve, addImport, addChunk }) {
      // Only ever process JS files
      if (format !== 'js') return null

      const ast = parse(isBuffer ? contents.toString() : contents, {
        plugins: ['dynamicImport'],
        sourceType: 'module',
        sourceFilename: filePath,
      })
      const promises = []
      traverse(ast, {
        ImportDeclaration({ node }) {
          const { source } = node
          if (!t.isStringLiteral(source)) return
          promises.push(
            resolve(source.value, source.loc).then(resolved => {
              source.value = getFileImportHash(resolved.filePath, resolved.format)
              addImport(resolved)
            }),
          )
        },
        CallExpression(path) {
          const { node } = path
          const { callee } = node
          const [arg] = node.arguments

          if (!t.isStringLiteral(arg)) return

          if (t.isImport(callee)) {
            promises.push(
              resolve(arg.value, arg.loc).then(resolved => {
                const chunk = getChunk(resolved.format, null, resolved.filePath)
                node.callee = t.memberExpression(t.identifier('require'), t.identifier('chunk'))
                arg.value = chunk.id
                addChunk(chunk)
              }),
            )
            return
          }

          if (!['require', 'require.resolve'].includes(getName(callee))) {
            return
          }
          // Handling require + require.resolve
          promises.push(
            resolve(arg.value, arg.loc).then(resolved => {
              arg.value = getFileImportHash(resolved.filePath, resolved.format)
              addImport(resolved)
            }),
          )
        },
      })

      await Promise.all(promises)

      const generated = generate(ast, {
        sourceMaps: true,
      })

      return {
        contents: generated.code,
        isBuffer: false,
        sourceMap: generated.map,
      }
    },
  })
}
