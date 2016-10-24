/* @flow */

import PundleFS from 'pundle-fs'
import promisify from 'sb-promisify'
import type { ComponentAny } from 'pundle-api/types'
import type { Config, ConfigComponent } from './types'

const resolve = promisify(require('resolve'))
export const pathIDMap = new Map()

export function fillConfig(config: Object): Config {
  const toReturn = {}

  const defaultExtensions = ['', '.js', '.json']
  const defaultPackageMains = ['pundle', 'browser', 'web', 'browserify', 'main']
  const defaultModuleDirectories = ['node_modules']

  toReturn.debug = !!config.debug
  if (config.entry && (typeof config.entry === 'string' || Array.isArray(config.entry))) {
    toReturn.entry = [].concat(config.entry)
  } else {
    throw new Error('config.entry should be a string or an Array')
  }

  if (typeof config.output !== 'object' || !config.output) {
    throw new Error('config.output must be an object')
  }
  toReturn.output = {}
  if (typeof config.output.filename !== 'string' || !config.output.filename) {
    throw new Error('config.output.filename must be a string')
  }
  toReturn.output.filename = config.output.filename
  if (config.output.pathType && config.output.pathType !== 'number' && config.output.pathType !== 'filePath') {
    throw new Error('config.output.pathType must be valid')
  }
  toReturn.output.pathType = config.output.pathType || (toReturn.debug ? 'filePath' : 'number')
  if (typeof config.output.directory !== 'string' || !config.output.directory) {
    throw new Error('config.output.directory must be a string')
  }
  toReturn.output.directory = config.output.directory
  if (config.output.publicPath && typeof config.output.publicPath !== 'string') {
    throw new Error('config.output.publicPath must be a string')
  }
  toReturn.output.publicPath = config.output.publicPath || null
  if (config.output.sourceFileName && typeof config.output.sourceFileName !== 'string') {
    throw new Error('config.output.sourceFileName must be a string')
  }
  toReturn.output.sourceFileName = config.output.sourceFileName || '[name].map'

  if (typeof config.resolve === 'object' && config.resolve) {
    toReturn.resolve = {}

    if (config.resolve.alias && typeof config.resolve.alias !== 'object') {
      throw new Error('config.resolve.alias must be an object')
    }
    toReturn.resolve.alias = config.resolve.alias || {}
    if (config.resolve.extensions && !Array.isArray(config.resolve.extensions)) {
      throw new Error('config.resolve.extensions must be an Array')
    }
    toReturn.resolve.extensions = config.resolve.extensions || defaultExtensions
    if (config.resolve.packageMains && !Array.isArray(config.resolve.packageMains)) {
      throw new Error('config.resolve.packageMains must be an Array')
    }
    toReturn.resolve.packageMains = config.resolve.packageMains || defaultPackageMains
    if (config.resolve.modulesDirectories && !Array.isArray(config.resolve.modulesDirectories)) {
      throw new Error('config.resolve.modulesDirectories must be an Array')
    }
    toReturn.resolve.modulesDirectories = config.resolve.modulesDirectories || defaultModuleDirectories
  } else {
    toReturn.resolve = {
      alias: {},
      extensions: defaultExtensions,
      packageMains: defaultPackageMains,
      modulesDirectories: defaultModuleDirectories,
    }
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

export async function getComponents(components: Array<ConfigComponent>): Promise<Array<{ component: ComponentAny, config: Object }>> {
  const processed = []
  for (const entry of (components: Array<ConfigComponent>)) {
    let config = {}
    let component
    if (typeof entry === 'string') {
      component = await resolve(entry)
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
