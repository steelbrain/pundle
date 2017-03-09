/* @flow */

import type { ModuleNormal } from '../types'

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

global.root = global.root || root
global.GLOBAL = global.GLOBAL || GLOBAL
global.global = global.global || global
global.process = global.process || require('process')

global.__sbPundle = global.__sbPundle || {
  cache: {},
  chunks: {},
  mapChunks: {},
  mapModules: {},
  resolve(path) {
    return path
  },
  getModule(moduleId, callback) {
    return {
      id: moduleId,
      invoked: false,
      callback,
      exports: {},
      parents: [],
    }
  },
  registerMappings(mappings) {
    Object.assign(this.mapChunks, mappings.chunks)
    for (const moduleId in mappings.files) {
      mappings.files[moduleId].forEach((requestId) => {
        this.mapModules[requestId] = moduleId
      })
    }
  },
  registerLoaded(chunkId) {
    if (this.chunks[chunkId]) {
      this.chunks[chunkId].resolve()
    } else {
      this.chunks[chunkId] = { promise: Promise.resolve(), resolve() {}, reject() {} }
    }
  },
  registerModule(moduleId, callback) {
    if (this.cache[moduleId]) {
      this.cache[moduleId].callback = callback
    } else {
      this.cache[moduleId] = this.getModule(moduleId, callback)
    }
  },
  requireModule(fromModule: string, givenRequest: string) {
    const request = this.mapModules[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error(`Module '${request}' not found. Did you forget to load the parent chunks before this one?`)
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
  generateRequire(fromModule: string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.resolve = this.resolve
    require.ensure = (chunk, callback) => this.ensure(chunk, () => callback(require))
    require.import = (chunk, moduleId) => new Promise((resolve, reject) => this.ensure(chunk, () => resolve(require(moduleId)), reject))
    return require
  },
  require(request: string) {
    return this.requireModule('$root', request)
  },
  ensure(requestedChunk: string | Array<string>, loadedCallback: Function, errorCallback: Function) {
    // $FlowIgnore: This is a replaced var
    if (typeof SB_PUNDLE_PUBLIC_PRE === 'undefined') {
      throw new Error('Please specify config.output.publicRoot in configuration')
    }

    const requestedChunks = [].concat(requestedChunk)
    requestedChunks.forEach(entry => {
      const chunkId = this.mapChunks[entry]
      if (!this.chunks[chunkId]) {
        let resolve
        let reject
        const promise = new Promise(function(_resolve, _reject) {
          resolve = _resolve
          reject = _reject
        })
        this.chunks[chunkId] = { promise, resolve, reject }
        const script = document.createElement('script')
        // $FlowIgnore: These are replaced vars
        script.src = `${SB_PUNDLE_PUBLIC_PRE}.${chunkId}${SB_PUNDLE_PUBLIC_POST}`
        script.onerror = reject
        // $FlowIgnore: It's never null bro
        document.body.appendChild(script)
      }
      return this.chunks[chunkId].promise.then(loadedCallback, errorCallback)
    })
  },
}
