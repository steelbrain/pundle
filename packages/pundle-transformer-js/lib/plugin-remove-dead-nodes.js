// @flow

import * as t from '@babel/types'

// Empty out bodies of falsy parts of if/else statements
// to avoid requiring modules that aren't needed aka
// if (process.env.NODE_ENV === 'production') module.exports = require('./prod-version') else module.exports = require('./dev-version')
// OR
// module.exports = process.env.NODE_ENV === 'production' ? require('./prod-version') : require('./dev-version')

function processBooleanConditional(path) {
  const { node } = path
  const { test, consequent, alternate } = node

  if (test && test.type === 'BooleanLiteral') {
    if (test.value) {
      if (alternate) {
        if (t.isBlockStatement(alternate)) {
          node.alternate = null
        } else {
          node.alternate = t.numericLiteral(0)
        }
      }
    } else {
      consequent.body = []
    }
  }
}

export default {
  visitor: {
    IfStatement: {
      exit: processBooleanConditional,
    },
    ConditionalExpression: {
      exit: processBooleanConditional,
    },
  },
}
