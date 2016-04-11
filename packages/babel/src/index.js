'use strict'

/* @flow */

import { transform } from 'babel-core'

function getBabelTransformer(pundle: Object, parameters: Object = {}) {
  if (!(parameters.ignored instanceof RegExp)) {
    parameters.ignored = /(node_modules|bower_components)/
  }
  if (!parameters.config || typeof parameters.config !== 'object') {
    parameters.config = {}
  }
  pundle.observeCompilations(function(compilation) {
    compilation.onBeforeCompile(function(event) {
      if (event.filePath.indexOf('$root') !== 0 || event.filePath.match(parameters.ignored)) {
        return
      }
      if (typeof parameters.include !== 'undefined' && !event.filePath.match(parameters.include)) {
        return
      }
      const processed = transform(event.contents, Object.assign({}, parameters.config, {
        filename: pundle.path.out(event.filePath),
        sourceFileName: event.filePath,
        inputSourceMap: event.sourceMap,
        sourceMap: true
      }))

      event.contents = processed.code
      event.sourceMap = processed.sourceMap
    })
  })
}

module.exports = getBabelTransformer
