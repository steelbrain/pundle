// @flow

import os from 'os'
import path from 'path'

import { PundleError, type Context } from 'pundle-api'
import type { Config, AcceptedConfig } from './types'
import readConfigFile from './readConfigFile'
import validateAndTransformConfig from './validateAndTransformConfig'

export type { Config, AcceptedConfig }
export default async function loadConfig(context: Context): Promise<Config> {
  // $FlowFixMe: Flow typing error with await
  const { configFilePath, config: fileConfigContents } = await readConfigFile(context)

  const fileConfig = await validateAndTransformConfig({
    context,
    config: fileConfigContents,
  })
  const inlineConfig = await validateAndTransformConfig({
    context,
    config: context.configInline,
  })
  if (typeof inlineConfig.components !== 'undefined') {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', 'config.components is not allowed in inline config')
  }

  const config = {
    cache: {
      reset: false,
      enabled: true,
      cacheKey: process.env.NODE_ENV || 'development',
      rootDirectory: path.join(os.tmpdir(), '.pundle'),
    },
    entry: [],
    target: process.env.PUNDLE_TARGET || 'browser',
    rootDirectory: fileConfig.rootDirectory,
    output: {
      formats: {
        static: 'assets/[id][ext]',
        html: '[name].[format]',
        '*': 'assets/[id].[format]',
      },
      rootDirectory: '',
    },
    components: [],
    configFilePath: null,
  }
  if (typeof fileConfig.cache !== 'undefined') {
    if (fileConfig.cache === false) {
      config.cache.enabled = false
    } else {
      Object.assign(config.cache, fileConfig.cache)
    }
  }
  if (typeof inlineConfig.cache !== 'undefined') {
    if (inlineConfig.cache === false) {
      config.cache.enabled = false
    } else {
      Object.assign(config.cache, inlineConfig.cache)
    }
  }
  if (inlineConfig.entry) {
    config.entry = config.entry.concat(inlineConfig.entry)
  }
  if (fileConfig.entry) {
    config.entry = config.entry.concat(fileConfig.entry)
  }
  if (fileConfig.target) {
    config.target = fileConfig.target
  }
  if (inlineConfig.target) {
    config.target = inlineConfig.target
  }
  if (fileConfig.output) {
    config.output.rootDirectory = fileConfig.output.rootDirectory
    Object.assign(config.output.formats, fileConfig.output.formats)
  }
  if (typeof inlineConfig.output === 'object' && inlineConfig.output !== null) {
    config.output.rootDirectory = inlineConfig.output.rootDirectory
    Object.assign(config.output.formats, inlineConfig.output.formats)
  }
  if (fileConfig.components) {
    config.components = fileConfig.components.sort((a, b) => b.priority - a.priority)
  }
  if (configFilePath) {
    config.configFilePath = configFilePath
  }

  return config
}
