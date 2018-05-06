// @flow

import fs from 'sb-fs'
import path from 'path'
// eslint-disable-next-line
import { fromStack } from 'sb-callsite'
import { PundleError } from 'pundle-api'

type Payload = {|
  directory: string,
  configFileName: string,
  loadConfigFile: boolean,
|}

export default async function readConfigFile({ directory, configFileName, loadConfigFile }: Payload): Promise<Object> {
  if (!loadConfigFile) {
    return { rootDirectory: directory }
  }
  const configFilePath = path.join(directory, configFileName)
  if (!(await fs.exists(configFilePath))) {
    throw new PundleError('CONFIG', 'CONFIG_NOT_FOUND', configFilePath)
  }
  let configContents
  try {
    // $FlowFixMe
    configContents = require(configFilePath) // eslint-disable-line global-require,import/no-dynamic-require
  } catch (error) {
    if (error && error.stack) {
      const stackFrame = fromStack(error.stack).find(i => path.isAbsolute(i.file))
      throw new PundleError(
        'CONFIG',
        'INVALID_CONFIG',
        stackFrame && stackFrame.file,
        stackFrame
          ? {
              line: stackFrame.line,
              col: typeof stackFrame.col === 'number' ? stackFrame.col - 1 : 0,
            }
          : null,
        error.message,
      )
    }
    throw error
  }
  if (!configContents || typeof configContents !== 'object') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', configFileName, null, 'Exported config is not a valid object')
  }

  // Normalize es export
  const config = configContents.__esModule ? configContents.default : configContents
  if (!config || typeof config !== 'object') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', configFileName, null, 'Exported ESM config is not a valid object')
  }

  return config
}
