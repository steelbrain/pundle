/* @flow */

import type { ModuleNormal } from '../types'

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

const __sbPundle = {
  cache: {},
  extensions: [],
  resolutionMap: {},
  resolve: function(path) {
    return path
  },
  getModule: function(moduleId, callback) {
    return {
      id: moduleId,
      invoked: false,
      callback: callback,
      parents: [],
    }
  },
  registerMappings: function(mappings) {
    for (const key in mappings) {
      mappings[key].forEach(value => {
        this.resolutionMap[value] = key
      })
    }
  },
  registerModule: function(moduleId, callback) {
    if (this.cache[moduleId]) {
      this.cache[moduleId].invoked = false
      this.cache[moduleId].callback = callback
    } else {
      this.cache[moduleId] = this.getModule(moduleId, callback)
    }
  },
  requireModule: function(fromModule: string, givenRequest: string) {
    const request = this.resolutionMap[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error('Module not found')
    }
    if (module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
      module.parents.push(fromModule)
    }
    if (!module.invoked) {
      module.invoked = true
      module.callback.call(module.exports, module.id, '/', this.generateRequire(module.id), module, module.exports)
    }
    return module.exports
  },
  generateRequire: function(fromModule: string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    return require
  },
  require: function(request: string) {
    return this.requireModule('$root', request)
  },
}
