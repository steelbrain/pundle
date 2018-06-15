// @flow

import * as t from '@babel/types'
import { getName } from './helpers'

export default function getPluginReplaceProcess(browser: boolean, givenEnv: Object) {
  const env = {
    ...givenEnv,
    NODE_ENV: givenEnv.NODE_ENV || 'development',
  }

  return {
    visitor: {
      MemberExpression(path: Object) {
        const name = getName(path.node, ['process'], 3)
        if (name === null) return
        if (name === 'process.browser') {
          if (browser) {
            path.replaceWith(t.booleanLiteral(browser))
          }
          // NOTE: Leaving unchanged for node envs on purpose
          return
        }
        if (name.slice(0, 12) === 'process.env.') {
          const envName = name.slice(12)
          if (browser || env[envName]) {
            path.replaceWith(t.valueToNode(env[envName]))
          } else return
        }

        if (path.parentPath.isBinaryExpression()) {
          const evaluated = path.parentPath.evaluate()
          if (evaluated.confident) {
            path.parentPath.replaceWith(t.valueToNode(evaluated.value))
          }
        }
      },
    },
  }
}
