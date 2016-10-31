/* @flow */

import { createTransformer, shouldProcess } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createTransformer(async function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let babelPath
  try {
    babelPath = await this.resolve('babel-core')
  } catch (_) {
    throw new Error('Unable to find babel-core installed locally in the project')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const babel = require(babelPath) // eslint-disable-line global-require

  const processed = babel.transform(file.contents, Object.assign({}, config.config, {
    filename: file.filePath,
    sourceMap: true,
    highlightCode: false,
    sourceFileName: file.filePath,
  }))
  const contents = processed.code
  const sourceMap = processed.map

  return { contents, sourceMap }
}, {
  config: {},
  include: [],
  exclude: [/(node_modules|bower_components)/],
})
