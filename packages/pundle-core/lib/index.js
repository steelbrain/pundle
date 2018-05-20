// @flow

import loadConfig, { type AcceptedConfig } from 'pundle-core-load-config'

import Master from './master'
import { CONFIG_FILE_NAME } from './constants'

type RunOptions = {|
  config?: AcceptedConfig,
  directory?: string,
  configFileName?: string,
  loadConfigFile?: boolean,
|}

export default async function getPundle({
  directory = process.cwd(),
  config: inlineConfig = {},
  configFileName = CONFIG_FILE_NAME,
  loadConfigFile = true,
}: RunOptions = {}) {
  const config = await loadConfig({
    directory,
    config: inlineConfig,
    configFileName,
    loadConfigFile,
  })
  const master = new Master(config, {
    directory,
    config: inlineConfig,
    configFileName,
    loadConfigFile,
  })
  await master.spawnWorkers()
  return master
}
