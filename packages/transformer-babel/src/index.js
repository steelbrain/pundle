/* @flow */

import { createTransformer, shouldProcess, FileIssue, FileMessageIssue, MessageIssue } from 'pundle-api'
import type { File, Context } from 'pundle-api/types'

export default createTransformer(async function(context: Context, config: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let babelPath = config.babelPath
  try {
    babelPath = await context.resolve(babelPath, null, true)
  } catch (_) {
    throw new MessageIssue('Unable to find babel-core', 'error')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const babel = require(babelPath)

  let processed
  try {
    processed = babel.transform(file.contents, Object.assign({}, config.config, {
      filename: file.filePath,
      sourceMap: true,
      highlightCode: false,
      sourceFileName: file.filePath,
    }))
  } catch (error) {
    if (error.loc) {
      throw new FileIssue(file.getFilePath(), file.getContents(), error.loc.line, error.loc.column + 1, error.message, 'error')
    } else {
      throw new FileMessageIssue(file.getFilePath(), error.message)
    }
  }
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
