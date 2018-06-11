// @flow

import { Context } from 'pundle-api'
import loadConfig, { type Config } from 'pundle-core-load-config'

import Master from './master'
import getWatcher from './watcher'
import { CONFIG_FILE_NAME } from './constants'

export async function getPundleConfig({
  configFileName = CONFIG_FILE_NAME,
  configLoadFile = true,
  directory = process.cwd(),
}: {
  configFileName?: string,
  configLoadFile?: boolean,
  directory?: string,
}): Promise<Config> {
  const context: Context = new Context({
    config: ({}: Object),
    configInline: {},
    configFileName,
    configLoadFile,
    directory,
  })
  return loadConfig(context)
}

export async function getPundle({
  config: configInline = {},
  configFileName = CONFIG_FILE_NAME,
  configLoadFile = true,
  directory = process.cwd(),
}: { config?: Object, configFileName?: string, configLoadFile?: boolean, directory?: string } = {}) {
  const context: Context = new Context({
    config: ({}: Object),
    configInline,
    configFileName,
    configLoadFile,
    directory,
  })
  context.config = await loadConfig(context)
  const master = new Master(context)
  await master.initialize()
  return master
}
export { getWatcher }
export type { Master }
