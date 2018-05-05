// @flow

import fs from 'sb-fs'
import path from 'path'
import difference from 'lodash/difference'
import { PundleError, validateComponent } from 'pundle-api'

import type { Config } from './types'

const ALLOWED_CONFIG_FILE_KEYS = ['entry', 'rootDirectory', 'output', 'components']
const ALLOWED_CONFIG_FILE_OUTPUT_KEYS = ['name', 'sourceMap', 'sourceMapName', 'rootDirectory']

type Payload = {|
  directory: string,
  configFileName: string,
  config: Object,
|}

export default async function validateAndTransformConfig({
  directory,
  configFileName,
  config: givenConfig,
}: Payload): Promise<Config> {
  const config = { ...givenConfig }
  const extraConfigKeys = difference(Object.keys(config), ALLOWED_CONFIG_FILE_KEYS)
  if (extraConfigKeys.length) {
    throw new PundleError(
      'CONFIG',
      'INVALID_CONFIG',
      configFileName,
      null,
      `Unknown config keys recieved: ${extraConfigKeys.join(', ')}`,
    )
  }

  const faults = []

  if (config.entry) {
    if (Array.isArray(config.entry)) {
      if (!config.entry.every(item => typeof item === 'string' && item)) {
        faults.push(`config.entry if Array must contain valid strings`)
      }
    } else if (typeof config.entry !== 'string') {
      faults.push(`config.entry must be a string or an Array`)
    }
  }
  if (config.rootDirectory) {
    if (typeof config.rootDirectory !== 'string') {
      faults.push(`config.rootDirectory must be a valid string`)
    } else {
      const resolved = path.resolve(config.rootDirectory)
      const isResolved = resolved !== config.rootDirectory
      if (!(await fs.exists(resolved))) {
        faults.push(`config.rootDirectory ${isResolved ? 'resolved to ' : ''}'${resolved}' but it does not exist`)
      }
      if (isResolved) {
        config.rootDirectory = resolved
      }
    }
  } else {
    config.rootDirectory = directory
  }

  if (config.output) {
    if (typeof config.output !== 'object') {
      faults.push(`config.output must be a valid object`)
    } else {
      const extraConfigOutputKeys = difference(Object.keys(config.output), ALLOWED_CONFIG_FILE_OUTPUT_KEYS)
      if (extraConfigOutputKeys.length) {
        faults.push(`config.output contains unknown keys: '${extraConfigOutputKeys.join(', ')}'`)
      } else {
        if (!config.output.name || typeof config.output.name !== 'string') {
          faults.push('config.output.name must be a valid string')
        }
        if (config.output.sourceMapName && typeof config.output.soruceMapName !== 'string') {
          faults.push('config.output.sourceMapName must be a valid string or falsy')
        }
        if (!config.output.rootDirectory || typeof config.output.rootDirectory !== 'string') {
          faults.push('config.output.rootDirectory must be a valid string')
        } else {
          const resolved = path.resolve(config.output.rootDirectory)
          const isResolved = resolved !== config.output.rootDirectory
          if (!(await fs.exists(path.dirname(resolved)))) {
            faults.push(
              `config.output.rootDirectory ${
                isResolved ? 'resolved to ' : ''
              }'${resolved}' but it's parent directory does not exist`,
            )
          }
          if (isResolved) {
            config.output.rootDirectory = resolved
          }
        }
      }
    }
  }

  if (config.components) {
    if (!Array.isArray(config.components)) {
      faults.push(`config.components must be a valid Array`)
    } else {
      config.components.forEach(function(component, index) {
        const componentFaults = validateComponent(component)
        if (componentFaults.length) {
          faults.push(...componentFaults.map(item => `config.components[${index}].${item}`))
        }
      })
    }
  }

  if (faults.length) {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', configFileName, null, faults.join(', '))
  }
  return config
}
