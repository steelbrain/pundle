// @flow

import fs from 'sb-fs'
import path from 'path'
import omit from 'lodash/omit'
import { PundleError } from 'pundle-api'

type Payload = {|
  directory: string,
  configFileName: string,
  loadConfigFile: boolean,
|}
type ConfigFile = {
  entry?: Array<string> | string,
  rootDirectory: string,
  output?: {
    name: string,
    sourceMap?: boolean,
    sourceMapName?: string,
    rootDirectory: string,
  },
}

export default async function readConfigFile({ directory, configFileName, loadConfigFile }: Payload): Promise<ConfigFile> {
  if (!loadConfigFile) {
    return { rootDirectory: directory }
  }
  const configFilePath = path.join(directory, configFileName)
  if (!(await fs.exists(configFilePath))) {
    throw new PundleError('FILE', 'FILE_NOT_FOUND', configFilePath)
  }
  let configContents
  try {
    // $FlowFixMe
    configContents = require(configFilePath) // eslint-disable-line global-require,import/no-dynamic-require
  } catch (error) {
    // TODO: Handle this better
    console.log('handle this error', error)
    return { rootDirectory: directory }
  }
  if (!configContents || typeof configContents !== 'object') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', configFileName, null, 'Exported config is not a valid object')
  }

  const config = omit(configContents, '__esModule')
  console.log('config', config)
}
