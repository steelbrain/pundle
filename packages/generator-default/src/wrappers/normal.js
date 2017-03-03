/* @flow */

import type { ModuleNormal } from '../types'

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global
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
  registerMappings(currentChunk, mappings) {
    if (this.chunks[currentChunk]) {
      this.chunks[currentChunk].resolve()
    } else {
      this.chunks[currentChunk] = { promise: Promise.resolve(), resolve() {}, reject() {} }
    }
    Object.assign(this.mapChunks, mappings.chunks)

    for (const chunkId in mappings.imports) {
      for (const moduleId in mappings.imports[chunkId]) {
        mappings.imports[chunkId][moduleId].forEach((requestId) => {
          this.mapModules[requestId] = { chunkId: mappings.chunks[chunkId], moduleId }
        })
      }
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
    let request = this.mapModules[givenRequest] || givenRequest
    if (typeof request === 'object') {
      if (!this.chunks[request.chunkId]) {
        throw new Error('Unable to require module from a chunk thats not yet loaded')
      }
      // TODO: We can't know if the promise is resolved or not
      request = request.moduleId
    }
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
  generateRequire(fromModule: string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    require.ensure = this.ensure.bind(this)
    return require
  },
  require(request: string) {
    return this.requireModule('$root', request)
  },
  ensure(requestedChunk: string, moduleId: string, loadedCallback: Function) {
    const chunkId = this.mapChunks[requestedChunk]
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
    this.chunks[chunkId].promise.then(() => loadedCallback(this.generateRequire(moduleId)))
  },
}
