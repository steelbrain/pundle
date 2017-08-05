/* @flow */

import Path from 'path'
import { createTransformer, shouldProcess, FileIssue, FileMessageIssue, MessageIssue } from 'pundle-api'
import type { File, Context } from 'pundle-api/types'

const checkedRootDirectories = new Set()
export default createTransformer(async function(context: Context, config: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let babelPath = config.babelPath
  try {
    babelPath = await context.resolve(babelPath, null, true)
  } catch (_) {
    throw new MessageIssue('Unable to find babel-core. Please install it in your project root (transformer-babel)', 'error')
  }

  // $FlowIgnore: Flow doesn't like dynamic requires
  const babel = require(babelPath)

  let processed
  try {
    const mergedConfigs = {
      babelrc: false,
      filename: file.filePath,
      sourceMap: true,
      highlightCode: false,
      sourceFileName: file.filePath,
    }
    if (file.filePath.startsWith(context.config.rootDirectory)) {
      Object.assign(mergedConfigs, {
        babelrc: true,
        ...config.config,
      })
    }
    // eslint-disable-next-line no-constant-condition
    if (!checkedRootDirectories.has(context.config.rootDirectory) && false) {
      const check = babel.transform('export default class Foo {}', {
        ...mergedConfigs,
        filename: Path.join(context.config.rootDirectory, 'test.js'),
      }).code
      if (!check.includes('export default') && !check.includes('export { Foo as default }')) {
        // TODO: Link it to pundle docs instead
        throw new MessageIssue('Your Babel configuration specifies a module transformer. Please disable it. See https://github.com/rollup/rollup-plugin-babel#configuring-babel for more information')
      }
      checkedRootDirectories.add(context.config.rootDirectory)
    }
    processed = babel.transform(file.getContents(), mergedConfigs)
  } catch (error) {
    if (error.loc) {
      throw new FileIssue(file.getFilePath(), file.getContents(), error.loc.line, error.loc.column, error.message, 'error')
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
