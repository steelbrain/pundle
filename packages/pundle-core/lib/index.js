// @flow

import loadConfig from 'pundle-core-load-config'

import { CONFIG_FILE_NAME } from './constants'

type Options = {|
  config?: $FlowFixMe,
  directory?: string,
  configFileName?: string,
  loadConfigFile?: boolean,
|}
export default async function getPundle({
  directory = process.cwd(),
  config: inlineConfig = {},
  configFileName = CONFIG_FILE_NAME,
  loadConfigFile = true,
}: Options = {}) {
  const config = await loadConfig({
    directory,
    inlineConfig,
    configFileName,
    loadConfigFile,
  })
  console.log(config)
}
