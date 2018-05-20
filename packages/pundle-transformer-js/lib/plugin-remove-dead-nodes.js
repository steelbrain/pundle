// @flow

// Empty out bodies of falsy parts of if/else statements
// to avoid requiring modules that aren't needed aka
// if (process.env.NODE_ENV === 'production') module.exports = require('./prod-version') else module.exports = require('./dev-version')
// OR
// module.exports = process.env.NODE_ENV === 'production' ? require('./prod-version') : require('./dev-version')

export default {
  visitor: {
    IfStatement: {
      exit(path) {
        const { node } = path
        const { test, consequent } = node

        if (test && test.type === 'BooleanLiteral') {
          if (test.value) {
            if (node.alternate) {
              node.alternate = null
            }
          } else {
            consequent.body = []
          }
        }
      },
    },
  },
}
