/* @flow */

import PundleFS from 'pundle-fs'
import promisify from 'sb-promisify'
import type { ComponentAny } from 'pundle-api/types'
import type { Config, ConfigComponent } from './types'

const resolve = promisify(require('resolve'))
export const pathIDMap = new Map()

export function fillConfig(config: Object): Config {
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

  if (typeof config.rootDirectory !== 'string' || !config.rootDirectory) {
    throw new Error('config.rootDirectory must be a string')
  }
  toReturn.rootDirectory = config.rootDirectory

  if (config.replaceVariables && typeof config.replaceVariables !== 'object') {
    throw new Error('config.replaceVariables must be an Object')
  }
  toReturn.replaceVariables = Object.assign({}, {
    'process.env.NODE_ENV': toReturn.debug ? 'development' : 'production',
  }, config.replaceVariables)

  return toReturn
}

export async function getComponents(components: Array<ConfigComponent>, rootDirectory: string): Promise<Array<{ component: ComponentAny, config: Object }>> {
  const processed = []
  for (const entry of (components: Array<ConfigComponent>)) {
    let config = {}
    let component
    if (typeof entry === 'string') {
      component = await resolve(entry, { basedir: rootDirectory })
    } else if (Array.isArray(entry)) {
      [component, config] = entry
    }
    if (typeof component !== 'string') {
      throw new Error('Unable to load invalid component')
    }
    /* eslint-disable global-require */
    // $FlowIgnore: I wanna use a variable in require
    let mainModule = require(component)
    /* eslint-disable no-underscore-dangle */
    // Support babel's export default
    mainModule = mainModule && mainModule.__esModule ? mainModule.default : mainModule
    if (typeof mainModule !== 'object' || !mainModule) {
      throw new Error(`Component '${component}' exported incorrectly`)
    }
    component = mainModule
    processed.push({ component, config })
  }
  return processed
}
