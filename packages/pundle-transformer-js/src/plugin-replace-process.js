// @flow

import * as t from '@babel/types'
import { getName } from './helpers'

export default function getPluginReplaceProcess(browser: boolean) {
  return {
    visitor: {
      MemberExpression(path: Object) {
        const name = getName(path.node, ['process'], 3)
        if (name === null || t.isAssignmentExpression(path.parent)) return
        if (name === 'process.browser') {
          if (browser) {
            path.replaceWith(t.booleanLiteral(browser))
          }
          // NOTE: Leaving unchanged for node envs on purpose
          return
        }
        if (name === 'process.env.NODE_ENV') {
          path.replaceWith(t.stringLiteral(process.env.NODE_ENV || 'development'))
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
