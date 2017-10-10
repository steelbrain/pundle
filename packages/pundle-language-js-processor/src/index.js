// @flow

import invariant from 'assert'
import traverse from 'babel-traverse'
import {
  shouldProcess,
  registerComponent,
} from 'pundle-api'
import type { File } from 'pundle-api/types'

import { version } from '../package.json'

// TODO: Should we bundle the require resolved ones in output? I think yes
const NAMES_RESOLVE_REQUIRE = ['require', 'require.resolve']
const NAMES_RESOLVE_MODULE = ['module.hot.accept', 'module.hot.decline']
const NAMES_DEPENDENCY_TIMER = ['setImmediate', 'clearImmediate']
const NAMES_DEPENDENCY_BUFFER = ['Buffer']
const NAMES_DEPENDENCY_BROWSER = ['browser']
const NAMES_DEPENDENCY_GLOBALS = ['global']

export default function() {
  return registerComponent({
    name: 'pundle-language-js-processor',
    version,
    hookName: 'language-process',
    async callback(context, options, file: File) {
      if (
        !shouldProcess(context.config.rootDirectory, file.filePath, options)
      ) {
        return
      }
      console.log('wut')
      const parsed = file.parsed
      invariant(parsed, 'file.parsed is null, is the parser working?!')
      traverse(parsed.ast, {
        ImportDeclaration(path) {

        },
        CallExpression(path) {
          if (path.node.callee.type === 'Import') {
            // Chunky async Import
            console.log('chunky async import', path)
          }
        },
        Identifier(path) {

        },
        MemberExpression(path) {

        },
      })
      console.log(file.parsed)
    },
    defaultOptions: {
      extensions: ['.js'],
    },
  })
}
