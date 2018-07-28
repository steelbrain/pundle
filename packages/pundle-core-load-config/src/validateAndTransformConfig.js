// @flow

import fs from 'sb-fs'
import path from 'path'
import difference from 'lodash/difference'
import { PundleError, validateComponent, type Context } from 'pundle-api'

import type { AcceptedConfig } from './types'

const ALLOWED_CONFIG_FILE_KEYS = ['cache', 'entry', 'rootDirectory', 'output', 'components']
const ALLOWED_CONFIG_FILE_OUTPUT_KEYS = ['formats', 'rootDirectory']
const ALLOWED_CONFIG_TARGET = ['node', 'browser']

type Payload = {|
  context: Context,
  config: Object,
|}

export default async function validateAndTransformConfig({
  context,
  config: configGiven,
}: Payload): Promise<AcceptedConfig> {
  const { configFilePath } = context

  const config = { ...configGiven }
  const extraConfigKeys = difference(Object.keys(config), ALLOWED_CONFIG_FILE_KEYS)
  if (extraConfigKeys.length) {
    throw new PundleError(
      'CONFIG',
      'INVALID_CONFIG',
      `Unknown config keys recieved: ${extraConfigKeys.join(', ')}`,
      configFilePath,
    )
  }

  const faults = []

  if (typeof config.cache !== 'undefined') {
    if (config.cache !== false && !(config.cache || typeof config.cache === 'object')) {
      faults.push(`config.cache must be false or an object`)
    } else if (config.cache) {
      if (typeof config.cache.rootDirectory !== 'undefined' && typeof config.cache.rootDirectory !== 'string') {
        faults.push(`config.cache.rootDirectory must be a valid string`)
      }
      if (typeof config.cache.cacheKey !== 'undefined' && typeof config.cache.cacheKey !== 'string') {
        faults.push('config.cache.cacheKey must be a valid string')
      }
    }
  }

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
  }

  if (config.output) {
    if (typeof config.output !== 'object') {
      faults.push(`config.output must be a valid object`)
    } else {
      const extraConfigOutputKeys = difference(Object.keys(config.output), ALLOWED_CONFIG_FILE_OUTPUT_KEYS)
      if (extraConfigOutputKeys.length) {
        faults.push(`config.output contains unknown keys: '${extraConfigOutputKeys.join(', ')}'`)
      }
      if (!config.output.rootDirectory || typeof config.output.rootDirectory !== 'string') {
        faults.push('config.output.rootDirectory must be a valid string')
      }
      if (config.output.formats) {
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
  if (config.target) {
    if (!ALLOWED_CONFIG_TARGET.includes(config.target))
      faults.push(`config.target (${String(config.target)}) must be one of ${ALLOWED_CONFIG_TARGET.join(', ')}`)
  }

  if (faults.length) {
    throw new PundleError('CONFIG', 'INVALID_CONFIG', faults.join(', '), configFilePath)
  }
  return config
}
