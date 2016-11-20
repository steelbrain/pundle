/* @flow */

// TODO: Implement HMR specific stuff
import type { ModuleNormal } from '../types'

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

class __sbPundle_HMR {
  data: Object;
  accepts: Set<string> = new Set();
  declines: Set<string> = new Set();
  callbacks_accept: Set<Function> = new Set();
  callbacks_dispose: Set<Function> = new Set();
  constructor(data: Object = {}) {
    this.data = data
  }
  accept(...params) {
    for (let i = 0, length = params.length; i < length; i++) {
      const param = params[i]
      if (Array.isArray(param)) {
        this.accept(...params)
      } else if (typeof param === 'function') {
        this.callbacks_accept.add(param)
      } else if (typeof param === 'string') {
        this.accepts.add(param)
      } else {
        throw new Error('Unknown data type provided to module.hot.accept()')
      }
    }
    if (!params.length || !this.accepts.size) {
      this.accepts.add('*')
    }
  }
  decline(...params) {
    for (let i = 0, length = params.length; i < length; i++) {
      const param = params[i]
      if (Array.isArray(param)) {
        this.decline(...params)
      } else if (typeof param === 'string') {
        this.declines.add(param)
      } else {
        throw new Error('Unknown data type provided to module.hot.decline()')
      }
    }
    if (!params.length) {
      this.declines.add('*')
    }
  }
  dispose(callback: Function) {
    this.callbacks_dispose.add(callback)
  }
  addDisposeHandler(callback: Function) {
    this.callbacks_dispose.add(callback)
  }
  removeDisposeHandler(callback: Function) {
    this.callbacks_dispose.delete(callback)
  }
}

const __sbPundle = {
  defaultExport: {},
  cache: {},
  extensions: [],
  resolutionMap: {},
  resolve(path) {
    return path
  },
  getModule(moduleId, callback) {
    return {
      id: moduleId,
      hot: new __sbPundle_HMR(),
      callback,
      exports: this.defaultExport,
      parents: [],
    }
  },
  registerMappings(mappings) {
    for (const key in mappings) {
      mappings[key].forEach(value => {
        this.resolutionMap[value] = key
      })
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
    const request = this.resolutionMap[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error('Module not found')
    }
    if (module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
      module.parents.push(fromModule)
    }
    if (module.exports === this.defaultExport) {
      module.exports = {}
      module.callback.call(module.exports, module.id, '/', this.generateRequire(fromModule), module, module.exports)
    }
    return module.exports
  },
  generateRequire(fromModule: string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    return require
  },
  require(request: string) {
    return this.requireModule('$root', request)
  },
  applyHMR(files: Array<string>) {
    console.log('apply HMR', files)
  },
}
