// @flow

import path from 'path'
import invariant from 'assert'
import importFrom from 'import-from'

import get from './get'
import type { ParsedConfig } from '../types'

const VALID_TARGETS = ['browser']

function normalizeEsModules(module) {
  // eslint-disable-next-line no-underscore-dangle
  if (module && module.__esModule) {
    return module.default
  }
  return module
}
function getMessagePostfix(configFilePath: string, parsed: ParsedConfig) {
  const relativeConfigPath = path.relative(
    parsed.config.rootDirectory,
    configFilePath,
  )
  return `at '${relativeConfigPath}'`
}
function validate(
  config: Object,
  configFilePath: string,
  parsed: ParsedConfig,
) {
  const postfix = getMessagePostfix(configFilePath, parsed)
  invariant(
    config && typeof config === 'object',
    `Pundle expects config to be non null object ${postfix}`,
  )
  invariant(
    !config.target || !VALID_TARGETS.includes(config.target),
    `Pundle expects config.target to be either undefined or one of ${VALID_TARGETS.join(
      ', ',
    )} ${postfix}`,
  )
  invariant(
    ['undefined', 'string'].includes(typeof config.entry) ||
      Array.isArray(config.entry),
    `Pundle expects config.entry to be either undefined, string or Array ${postfix}`,
  )
  invariant(
    typeof config.presets === 'undefined' || Array.isArray(config.presets),
    `Pundle expects config.presets to be either undefined or Array ${postfix}`,
  )
  invariant(
    typeof config.components === 'undefined' ||
      Array.isArray(config.components),
    `Pundle expects config.components to be either undefined or Array ${postfix}`,
  )
}

export default function loadConfig(
  configFilePath: string,
  parsed: ParsedConfig,
) {
  const postfix = getMessagePostfix(configFilePath, parsed)

  let config = {}
  try {
    // $FlowIgnore: Dynamic require
    config = normalizeEsModules(require(configFilePath)) // eslint-disable-line global-require,import/no-dynamic-require
  } catch (error) {
    error.message = `Error loading Pundle configuration file ${postfix}: ${error.message}`
    throw error
  }
  validate(config, configFilePath, parsed)

  if (config.entry) {
    if (Array.isArray(config.entry)) {
      parsed.config.entry.push(...config.entry)
    } else {
      parsed.config.entry.push(config.entry)
    }
  }
  if (config.target) {
    parsed.config.target = config.target
  }

  const configDirectory = path.dirname(configFilePath)
  get(config, 'components', []).forEach(function(entry) {
    const [entryComponent, options = {}] = Array.isArray(entry)
      ? entry
      : [entry]
    if (!options || typeof options !== 'object') {
      throw new Error(
        `Resolved config for component '${entryComponent}' referenced ${postfix} is invalid`,
      )
    }

    let component = entryComponent
    if (typeof component === 'string') {
      try {
        component = normalizeEsModules(
          importFrom(configDirectory, entryComponent),
        )
      } catch (error) {
        error.message = `Error loading component '${entryComponent}' referenced ${postfix}: ${error.message}`
        throw error
      }
    }
    if (typeof component === 'function') {
      component = component()
    } else {
      throw new Error(
        `Resolved value for component '${entryComponent}' referenced ${postfix} is not function`,
      )
    }

    try {
      parsed.components.register(component)
    } catch (error) {
      error.message = `Error registering component '${entryComponent}' referenced ${postfix}: ${error.message}`
      throw error
    }
    parsed.options.register(component, options)
  })

  get(config, 'presets', []).forEach(function(entry) {
    const [entryPreset, options = {}] = Array.isArray(entry) ? entry : [entry]
    if (!options || typeof options !== 'object') {
      throw new Error(
        `Resolved config for component '${entryPreset}' referenced ${postfix} is invalid`,
      )
    }

    let preset = entryPreset
    if (typeof preset === 'string') {
      try {
        preset = normalizeEsModules(importFrom(configDirectory, entryPreset))
      } catch (error) {
        error.message = `Error loading preset '${entryPreset}' referenced ${postfix}: ${error.message}`
        throw error
      }
    }
    if (typeof preset === 'function') {
      preset = preset(options)
    }
    if (!Array.isArray(preset)) {
      throw new Error(
        `Resolved value for preset '${entryPreset}' referenced ${postfix} is not an array`,
      )
    }

    preset.forEach(function(presetEntry) {
      const [entryComponent, componentOptions = {}] = Array.isArray(presetEntry)
        ? presetEntry
        : [presetEntry]
      if (!componentOptions || typeof componentOptions !== 'object') {
        throw new Error(
          `Resolved config for component '${entryComponent}' referenced in preset '${entryPreset}' ${postfix} is invalid`,
        )
      }

      let component = entryComponent
      if (typeof component === 'string') {
        try {
          component = normalizeEsModules(
            importFrom(configDirectory, entryComponent),
          )
        } catch (error) {
          error.message = `Error loading component '${entryComponent}' referenced in preset '${entryPreset}' ${postfix}: ${error.message}`
          throw error
        }
      }
      if (typeof component === 'function') {
        component = component()
      } else {
        throw new Error(
          `Resolved value for component '${entryComponent}' referenced in preset '${entryPreset}' ${postfix} is not function`,
        )
      }

      try {
        parsed.components.register(component)
      } catch (error) {
        error.message = `Error registering component '${entryComponent}' referenced in preset '${entryPreset}' ${postfix}: ${error.message}`
        throw error
      }
      parsed.options.register(component, options)
    })
  })
}
