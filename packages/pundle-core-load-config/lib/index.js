// @flow

import { PundleError, type Context } from 'pundle-api'
import type { Config, AcceptedConfig } from './types'
import readConfigFile from './readConfigFile'
import validateAndTransformConfig from './validateAndTransformConfig'

export type { Config, AcceptedConfig }
export default async function loadConfig(context: Context): Promise<Config> {
  const fileConfig = await validateAndTransformConfig({
    context,
    config: await readConfigFile(context),
  })
  const inlineConfig = await validateAndTransformConfig({
    context,
    config: context.configInline,
  })
  if (typeof inlineConfig.components !== 'undefined') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', 'config.components is not allowed in inline config')
  }

  const config = {
    entry: [],
    rootDirectory: fileConfig.rootDirectory,
    output: {
      formats: {},
      rootDirectory: '',
    },
    components: [],
  }
  if (fileConfig.entry) {
    config.entry = config.entry.concat(fileConfig.entry)
  }
  if (typeof inlineConfig.entry === 'string') {
    config.entry = config.entry.concat(inlineConfig.entry)
  }
  if (fileConfig.output) {
    Object.assign(config.output, fileConfig.output)
  }
  if (typeof inlineConfig.output === 'object' && inlineConfig.output !== null) {
    Object.assign(config.output, inlineConfig.output)
  }
  if (fileConfig.components) {
    config.components = fileConfig.components.sort((a, b) => b.priority - a.priority)
  }

  return config
}
