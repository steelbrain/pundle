/* @flow */

import Path from 'path'
import * as ts from 'typescript'

export default function getTypeScriptTransformer(pundle: Object, parameters: Object = {}) {
  if (parameters.ignored) {
    if (!(parameters.ignored instanceof RegExp)) {
      throw new Error('parameters.ignored must be a RegExp')
    }
  } else {
    parameters.ignored = /(node_modules|bower_components)/
  }

  if (parameters.extensions) {
    if (!Array.isArray(parameters.extensions)) {
      throw new Error('parameters.extensions must be an Array')
    }
  } else {
    parameters.extensions = ['.ts', '.tsx']
  }

  pundle.onBeforeProcess(function(event) {
    if (event.filePath.indexOf('$root') !== 0 || event.filePath.match(parameters.ignored) || parameters.extensions.indexOf(Path.extname(event.filePath)) === -1) {
      return
    }

    // docs at
    // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
    const processed = ts.transpileModule(
      event.contents,
      Object.assign({}, parameters.config)
    )

    event.contents = processed.outputText
    event.sourceMap = processed.sourceMapText
  })
}
