// @flow
/* eslint-disable no-param-reassign,prefer-destructuring */

import cloneDeep from 'lodash/cloneDeep'

const INJECTION_NAMES = new Set(['setImmediate', 'clearImmediate', 'Buffer', 'process'])

function makeTemplate(content: string) {
  let cachedValue
  return function({ template }) {
    if (!cachedValue) {
      cachedValue = template.ast(content)
    }
    return cloneDeep(cachedValue)
  }
}

const getTimersInjection = makeTemplate(
  `var __$sb$pundle$timers = require('timers'),
        setImmediate = __$sb$pundle$timers.setImmediate,
        clearImmediate=__$sb$pundle$timers.clearImmediate`,
)
const getBufferInjection = makeTemplate(`var Buffer = require('buffer').Buffer`)
const getProcessInjection = makeTemplate(`var process = require('process')`)

export default function getPluginInjectNodeGlobals({ template }: Object) {
  const injectionNames = new Set()

  return {
    visitor: {
      Identifier(path: Object) {
        const { node } = path
        if (
          INJECTION_NAMES.has(node.name) &&
          !injectionNames.has(node.name) &&
          path.isReferencedIdentifier() &&
          !path.scope.hasBinding(node.name)
        ) {
          injectionNames.add(node.name)
        }
      },
      Program: {
        exit(path: Object) {
          if (!injectionNames.size) return

          const statements = []
          if (injectionNames.has('setImmediate') || injectionNames.has('clearImmediate')) {
            statements.push(getTimersInjection({ template }))
          }
          if (injectionNames.has('Buffer')) {
            statements.push(getBufferInjection({ template }))
          }
          if (injectionNames.has('process')) {
            statements.push(getProcessInjection({ template }))
          }
          path.node.body = statements.concat(path.node.body)
        },
      },
    },
  }
}
