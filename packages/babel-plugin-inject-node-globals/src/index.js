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

const INJECTIONS = Symbol('Node Global Injections')

export default function getPluginInjectNodeGlobals({ template }: Object) {
  return {
    visitor: {
      Identifier(path: Object) {
        const { node } = path
        if (
          INJECTION_NAMES.has(node.name) &&
          !path.hub[INJECTIONS].has(node.name) &&
          path.isReferencedIdentifier() &&
          !path.scope.hasBinding(node.name)
        ) {
          path.hub[INJECTIONS].add(node.name)
        }
      },
      Program: {
        enter(path: Object) {
          path.hub[INJECTIONS] = new Set()
        },
        exit(path: Object) {
          const injections = path.hub[INJECTIONS]

          if (!injections.size) return

          const statements = []
          if (injections.has('setImmediate') || injections.has('clearImmediate')) {
            statements.push(getTimersInjection({ template }))
          }
          if (injections.has('Buffer')) {
            statements.push(getBufferInjection({ template }))
          }
          if (injections.has('process')) {
            statements.push(getProcessInjection({ template }))
          }
          path.node.body = statements.concat(path.node.body)
        },
      },
    },
  }
}
