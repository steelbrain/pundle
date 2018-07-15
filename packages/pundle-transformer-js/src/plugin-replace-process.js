// @flow

import * as t from '@babel/types'
import { getName } from './helpers'

export default function getPluginReplaceProcess(browser: boolean) {
  return {
    visitor: {
      MemberExpression(path: Object) {
        const name = getName(path.node, ['process'], 3)
        if (name === null || t.isAssignmentExpression(path.parent)) return
        let modified = false
        if (name === 'process.browser' && browser) {
          // NOTE: Leaving unchanged for node envs on purpose
          modified = true
          path.replaceWith(t.booleanLiteral(browser))
        }
        if (name === 'process.env.NODE_ENV') {
          modified = true
          path.replaceWith(t.stringLiteral(process.env.NODE_ENV || 'development'))
        }

        if (modified && path.parentPath.isBinaryExpression()) {
          const evaluated = path.parentPath.evaluate()
          if (evaluated.confident) {
            path.parentPath.replaceWith(t.valueToNode(evaluated.value))
          }
        }
      },
    },
  }
}
