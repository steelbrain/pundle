// @flow

import fs from 'sb-fs'
import path from 'path'
// eslint-disable-next-line
import { fromStack } from 'sb-callsite'
import { PundleError, type Context } from '@pundle/api'

export default async function readConfigFile(context: Context): Promise<{ config: Object, configFilePath: ?string }> {
  const { directory, configFilePath, configLoadFile } = context

  if (!configLoadFile) {
    return { config: { rootDirectory: directory }, configFilePath: null }
  }
  const resolvedConfigFilePath = path.resolve(directory, configFilePath)
  if (!(await fs.exists(resolvedConfigFilePath))) {
    throw new PundleError('CONFIG', 'CONFIG_NOT_FOUND', 'Unable to find Config File', resolvedConfigFilePath)
  }
  let configContents
  try {
    // $FlowFixMe
    configContents = require(resolvedConfigFilePath) // eslint-disable-line global-require,import/no-dynamic-require
  } catch (error) {
    if (error && error.stack) {
      const stackFrame = fromStack(error.stack).find(i => path.isAbsolute(i.file))
      throw new PundleError(
        'CONFIG',
        error.code === 'MODULE_NOT_FOUND' ? 'FILE_NOT_FOUND' : 'INVALID_CONFIG',
        error.message,
        stackFrame && stackFrame.file,
        stackFrame
          ? {
              line: stackFrame.line,
              col: typeof stackFrame.col === 'number' ? stackFrame.col - 1 : 0,
            }
          : null,
      )
    }
    throw error
  }
  if (!configContents || typeof configContents !== 'object') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', 'Exported config is not a valid object', configFilePath)
  }

  // Normalize es export
  const config = configContents.__esModule ? configContents.default : configContents
  if (!config || typeof config !== 'object') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', 'Exported ESM config is not a valid object', configFilePath)
  }

  return { config, configFilePath: resolvedConfigFilePath }
}
