/* @flow */

import PundleFS from 'pundle-fs'
import promisify from 'sb-promisify'
import type { ComponentAny } from 'pundle-api/types'
import type { PundleConfig, CompilationConfig, Loadable } from './types'

const resolve = promisify(require('resolve'))

export function fillCompilationConfig(config: Object): CompilationConfig {
  const toReturn = {}

  toReturn.debug = !!config.debug
  if (config.entry && (typeof config.entry === 'string' || Array.isArray(config.entry))) {
    toReturn.entry = [].concat(config.entry)
  } else {
    throw new Error('config.entry should be a string or an Array')
  }

  if (config.fileSystem) {
    if (typeof config.fileSystem !== 'object' || typeof config.fileSystem.stat !== 'function' || typeof config.fileSystem.readFile !== 'function') {
      throw new Error('config.fileSystem must be an object implementing FS interface')
    }
    toReturn.fileSystem = config.fileSystem
  } else {
    toReturn.fileSystem = PundleFS
  }

  if (config.publicPath && typeof config.publicPath !== 'string') {
    throw new Error('config.publicPath must be a string')
  }
  toReturn.publicPath = config.publicPath || null

  if (typeof config.rootDirectory !== 'string' || !config.rootDirectory) {
    throw new Error('config.rootDirectory must be a string')
  }
  toReturn.rootDirectory = config.rootDirectory

  if (config.replaceVariables && typeof config.replaceVariables !== 'object') {
    throw new Error('config.replaceVariables must be an Object')
  }
  toReturn.replaceVariables = Object.assign({}, {
    'process.env.NODE_ENV': toReturn.debug ? '"development"' : '"production"',
  }, config.replaceVariables)

  return toReturn
}

export function fillPundleConfig(config: Object): PundleConfig {
  const toReturn = {}
  toReturn.compilation = fillCompilationConfig(config)
  if (config.watcher) {
    if (typeof config.watcher !== 'object') {
      throw new Error('config.watcher must be an Object')
    }
    toReturn.watcher = config.watcher
  } else toReturn.watcher = {}
  if (config.presets) {
    if (!Array.isArray(config.presets)) {
      throw new Error('config.presets must be an Array')
    }
    toReturn.presets = config.presets
  } else toReturn.presets = []
  if (config.components) {
    if (!Array.isArray(config.components)) {
      throw new Error('config.components must be an Array')
    }
    toReturn.components = config.components
  } else toReturn.components = []
  toReturn.enableConfigFile = typeof config.enableConfigFile === 'undefined' ? true : !!config.enableConfigFile
  return toReturn
}

export async function getComponent(entry: string, rootDirectory: string): Promise<any> {
  const resolved = await resolve(entry, { basedir: rootDirectory })
  /* eslint-disable global-require */
  // $FlowIgnore: We *have* to do this, sorry
  const component = require(resolved)
  /* eslint-enable global-require */
  // eslint-disable-next-line no-underscore-dangle
  const mainModule = component && component.__esModule ? component.default : component
  if (typeof mainModule !== 'object' || !mainModule) {
    throw new Error(`Component '${component}' exported incorrectly`)
  }
  return mainModule
}

export async function getComponents(components: Array<Loadable>, rootDirectory: string): Promise<Array<{ component: ComponentAny, config: Object }>> {
  const processed = []
  for (const entry of (components: Array<Loadable>)) {
    let config = {}
    let component
    if (Array.isArray(entry)) {
      [component, config] = entry
    } else {
      component = entry
    }
    // $FlowIgnore: FIXME: Fix this
    const mainModule = await getComponent(component, rootDirectory)
    processed.push({ component: mainModule, config })
  }
  return processed
}
