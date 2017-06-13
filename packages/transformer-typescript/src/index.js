/* @flow */

import { createTransformer, shouldProcess, MessageIssue } from 'pundle-api'
import type { File, Context } from 'pundle-api/types'

// TODO: Implement watching and everything
export default createTransformer(async function(context: Context, config: Object, file: File) {
  if (!shouldProcess(context.config.rootDirectory, file.filePath, config)) {
    return null
  }

  let typescriptPath = config.typescriptPath
  try {
    typescriptPath = await context.resolve(typescriptPath, null, true)
  } catch (_) {
    throw new MessageIssue('Unable to find typescript. Please install it in your project root (transformer-typescript)', 'error')
  }

  // NOTE: Docs at
  // https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
  // $FlowIgnore: Flow doesn't like dynamic requires
  const typescript = require(typescriptPath)
  const processed = typescript.transpileModule(
    file.getContents(),
    Object.assign({}, config.config),
  )

  const contents = processed.outputText
  const sourceMap = processed.sourceMap
    ? JSON.parse(processed.sourceMapText)
    : undefined

  return { contents, sourceMap }
}, {
  typescriptPath: 'typescript',
  // ^ Path to resolve to get the typescript module
  config: {},
  extensions: ['ts', 'tsx'],
})
