// @flow

import * as t from '@babel/types'

// Empty out bodies of falsy parts of if/else statements
// to avoid requiring modules that aren't needed aka
// if (process.env.NODE_ENV === 'production') module.exports = require('./prod-version') else module.exports = require('./dev-version')
// OR
// module.exports = process.env.NODE_ENV === 'production' ? require('./prod-version') : require('./dev-version')

function processBooleanConditional(path: $FlowFixMe) {
  const { node } = path
  const { test, consequent, alternate } = node

  if (!t.isBooleanLiteral(test)) return
  const { value } = test

  if (t.isIfStatement(node)) {
    if (value) {
      node.alternate = null
    } else consequent.body = []
  } else {
    path.replaceWith(value ? consequent : alternate)
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
