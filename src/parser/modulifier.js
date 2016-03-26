'use strict'

/* @flow */
/* eslint-disable new-cap */

function PundleModulifier({ types: t }: Object): Object {
  return {
    visitor: {
      Program(path) {
        if (this.pundle_modulified) {
          return
        }

        this.pundle_modulified = true
        path.replaceWith(t.Program([
          t.FunctionDeclaration(t.Identifier('__pundle_module_body'),
            [t.Identifier('require'), t.Identifier('module'), t.Identifier('exports')],
            t.BlockStatement(path.node.body))
        ]))
      }
    }
  }
}

module.exports = PundleModulifier
