/* @flow */

import Path from 'path'
import { transform } from 'babel-core'

export default function getBabelTransformer(pundle: Object, parameters: Object = {}) {
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
    parameters.extensions = ['.js']
  }
  if (!parameters.config || typeof parameters.config !== 'object') {
    parameters.config = {}
  }
  pundle.onBeforeProcess(function(event) {
    if (event.filePath.indexOf('$root') !== 0 || event.filePath.match(parameters.ignored) || parameters.extensions.indexOf(Path.extname(event.filePath)) === -1) {
      return
    }
    const processed = transform(event.contents, Object.assign({}, parameters.config, {
      filename: pundle.path.out(event.filePath),
      sourceMap: true,
      highlightCode: false,
      sourceFileName: event.filePath,
      inputSourceMap: event.sourceMap
    }))

    event.contents = processed.code
    event.sourceMap = processed.map
  })
}
