/* @flow */

import { createTransformer, shouldProcess, MessageIssue } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default createTransformer(async function(config: Object, file: File) {
  if (!shouldProcess(this.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let babelPath = config.babelPath
  try {
    babelPath = await this.resolve(babelPath)
  } catch (_) {
    throw new MessageIssue('Unable to find babel-core', 'error')
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
  babelPath: 'babel-core',
  // ^ Path to resolve to get the babel-core module
  config: {},
  extensions: [],
  exclude: [/(node_modules|bower_components)/],
})
