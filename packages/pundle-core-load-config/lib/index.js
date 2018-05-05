// @flow

import readConfigFile from './readConfigFile'

type Payload = {|
  directory: string,
  inlineConfig: {||},
  configFileName: string,
  loadConfigFile: boolean,
|}

export default async function loadConfig({ directory, inlineConfig, configFileName, loadConfigFile }: Payload) {
  const configFileContents = await readConfigFile({ directory, configFileName, loadConfigFile })
  console.log('configFileContents', configFileContents)

  const mergedConfig = {}
  return mergedConfig
}
