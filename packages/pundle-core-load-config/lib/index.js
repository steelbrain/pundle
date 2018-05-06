// @flow

import { PundleError } from 'pundle-api'
import type { Config, LoadedConfig } from './types'
import readConfigFile from './readConfigFile'
import validateAndTransformConfig from './validateAndTransformConfig'

type Payload = {|
  directory: string,
  config: Config,
  configFileName: string,
  loadConfigFile: boolean,
|}

export type { LoadedConfig as Config }
export default async function loadConfig({
  directory,
  config: givenInlineConfig,
  configFileName,
  loadConfigFile,
}: Payload): Promise<LoadedConfig> {
  const fileConfig = await validateAndTransformConfig({
    directory,
    configFileName,
    config: await readConfigFile({ directory, configFileName, loadConfigFile }),
  })
  const inlineConfig = await validateAndTransformConfig({
    directory,
    configFileName,
    config: givenInlineConfig,
  })
  if (inlineConfig.components) {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', null, null, 'config.components is not allowed in inline config')
  }

  let hasOutput = false
  const config = {
    entry: [],
    rootDirectory: directory,
    output: {
      name: '',
      rootDirectory: '',
    },
    components: [],
  }
  if (fileConfig.entry) {
    config.entry = config.entry.concat(fileConfig.entry)
  }
  if (inlineConfig.entry) {
    config.entry = config.entry.concat(inlineConfig.entry)
  }
  if (fileConfig.output) {
    hasOutput = true
    Object.assign(config.output, fileConfig.output)
  }
  if (inlineConfig.output) {
    hasOutput = true
    Object.assign(config.output, inlineConfig.output)
  }
  if (fileConfig.components) {
    config.components = fileConfig.components
  }

  if (!hasOutput) {
    // $FlowFixMe
    config.output = null
  }

  return config
}
