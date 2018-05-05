// @flow

import type { Config } from './types'
import readConfigFile from './readConfigFile'
import validateAndTransformConfig from './validateAndTransformConfig'

type Payload = {|
  directory: string,
  inlineConfig: Config,
  configFileName: string,
  loadConfigFile: boolean,
|}

export default async function loadConfig({
  directory,
  inlineConfig: givenInlineConfig,
  configFileName,
  loadConfigFile,
}: Payload) {
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
  console.log('configFileContents', fileConfig, inlineConfig)

  const mergedConfig = {}
  return mergedConfig
}
