// @flow

import * as t from '@babel/types'

// Empty out bodies of falsy parts of if/else statements
// to avoid requiring modules that aren't needed aka
// if (process.env.NODE_ENV === 'production') module.exports = require('./prod-version') else module.exports = require('./dev-version')
// OR
// module.exports = process.env.NODE_ENV === 'production' ? require('./prod-version') : require('./dev-version')

function processBooleanConditional(path: $FlowFixMe) {
  const { node } = path

  if (!t.isBooleanLiteral(node.test)) return

  function visitIfNode(leafNode) {
    if (!t.isBooleanLiteral(leafNode.test)) return
    const { test, consequent, alternate } = node

    if (test.value) {
      path.replaceWithMultiple(consequent.body)
      return
    }
    node.consequent.body = []
    if (t.isIfStatement(alternate)) {
      visitIfNode(alternate)
    } else if (t.isBlockStatement(alternate)) {
      path.replaceWithMultiple(alternate.body)
    }
  }

  if (t.isIfStatement(node)) {
    visitIfNode(node)
  } else {
    path.replaceWith(node.test.value ? node.consequent : node.alternate)
  }
}

export default {
  visitor: {
    IfStatement: processBooleanConditional,
    ConditionalExpression: processBooleanConditional,
  },
}
