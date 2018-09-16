// @flow
/* eslint-disable no-param-reassign,prefer-destructuring */

import { parse } from '@babel/parser'

const INJECTION_NAMES = new Set(['setImmediate', 'clearImmediate', 'Buffer', 'process'])

function makeTemplate(template: string) {
  let cachedValue
  return function() {
    if (!cachedValue) {
      cachedValue = parse(template).program.body[0]
    }
    return cachedValue
  }
}

const getTimersInjection = makeTemplate(
  `var __$sb$pundle$timers = require('timers'),
        setImmediate = __$sb$pundle$timers.setImmediate,
        clearImmediate=__$sb$pundle$timers.clearImmediate`,
)
const getBufferInjection = makeTemplate(`var Buffer = require('buffer').Buffer`)
const getProcessInjection = makeTemplate(`var process = require('process')`)

export default function getPluginInjectNodeGlobals() {
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
            statements.push(getTimersInjection())
          }
          if (injectionNames.has('Buffer')) {
            statements.push(getBufferInjection())
          }
          if (injectionNames.has('process')) {
            statements.push(getProcessInjection())
          }
          path.node.body = statements.concat(path.node.body)
        },
      },
    },
  }
}
