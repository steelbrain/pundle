/* @flow */

// NOTE: We are spec incompiant in that we trigger module.hot.accept() callback for not just the specified clause
// But for all clauses
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
  requireModule(fromModule: ?string, givenRequest: string) {
    const request = this.resolutionMap[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error('Module not found')
    }
    if (fromModule && module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
      module.parents.push(fromModule)
    }
    if (module.exports === this.defaultExport) {
      module.exports = {}
      module.callback.call(module.exports, module.id, '/', this.generateRequire(fromModule), module, module.exports)
    }
    return module.exports
  },
  generateRequire(fromModule: ?string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    return require
  },
  require(request: string) {
    return this.requireModule('$root', request)
  },
  /* eslint-disable */
  /**
   * Topological sorting function
   * @source https://github.com/marcelklehr/toposort/blob/de225fa7d55bb699dc927455ab0d1a3897d9d7b4/index.js
   * @license MIT
   */
  hmrSort: function(){function n(n,r){function e(f,u,d){if(d.indexOf(f)>=0)throw Error("Cyclic dependency: "+JSON.stringify(f));if(!~n.indexOf(f))throw Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: "+JSON.stringify(f));if(!t[u]){t[u]=!0;var c=r.filter(function(n){return n[0]===f});if(u=c.length){var a=d.concat(f);do{var l=c[--u][1];e(l,n.indexOf(l),a)}while(u)}o[--i]=f}}for(var i=n.length,o=Array(i),t={},f=i;f--;)t[f]||e(n[f],f,[]);return o}function r(n){for(var r=[],e=0,i=n.length;i>e;e++){var o=n[e];r.indexOf(o[0])<0&&r.push(o[0]),r.indexOf(o[1])<0&&r.push(o[1])}return r}return function(e){return n(r(e),e)}}(),
  /* eslint-enable */
  hmrIsAccepted(moduleId: string, matchAgainst: string = moduleId): 'no' | 'direct' | 'parent' {
    const module = this.cache[moduleId]
    if (module.hot.accepts.has('*') || module.hot.accepts.has(matchAgainst)) {
      return 'direct'
    }
    if (module.parents.some(i => this.hmrIsAccepted(i, matchAgainst))) {
      return 'parent'
    }
    return 'no'
  },
  hmrGetOrder(files: Array<string>): Array<string> {
    const input: Array<[string, string]> = []
    const added: Set<string> = new Set()
    const failed: Array<string> = []
    const duplicates: Array<[string, string]> = []
    const directUpdates: Array<string> = []

    const iterate = (from: string, parents: Array<string>) => {
      if (added.has(from)) {
        return
      }
      added.add(from)
      for (let i = 0, length = parents.length; i < length; ++i) {
        const parent = parents[i]
        if (added.has(parent)) {
          continue
        }
        const accepted = this.hmrIsAccepted(parent)
        if (accepted === 'no') {
          failed.push(parent)
          continue
        }

        const parentModule = this.cache[parent]
        if (added.has(`${from}-${parent}`) || added.has(`${parent}-${from}`)) {
          duplicates.push([from, parent])
          continue
        }
        added.add(`${from}-${parent}`)
        input.push([parent, from])
        if (accepted === 'parent' && parentModule.parents.length) {
          iterate(parent, parentModule.parents)
        }
      }
    }

    for (let i = 0, length = files.length; i < length; ++i) {
      const file = files[i]
      const updatedModule = this.cache[file]
      const accepted = this.hmrIsAccepted(file)
      if (accepted === 'no') {
        failed.push(file)
        continue
      }
      if (added.has(file) || (accepted === 'direct' && directUpdates.indexOf(file) !== -1)) {
        continue
      }
      if (accepted === 'direct') {
        directUpdates.push(file)
      } else if (accepted === 'parent' && updatedModule.parents.length) {
        iterate(file, updatedModule.parents)
      }
    }
    if (duplicates.length) {
      console.log('[HMR] Error: Update could not be applied because these modules require each other:\n' + duplicates.map(item => `  • ${item[0]} <--> ${item[0]}`).join('\n'))
      const error: Object = new Error('Unable to apply HMR because some modules require their parents')
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }
    if (failed.length) {
      console.log('[HMR] Error: Update could not be applied because these modules did not accept:\n' + failed.map(item => `  • ${item}`).join('\n'))
      const error: Object = new Error('Unable to apply HMR because some modules didnt accept it')
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }

    const sorted = this.hmrSort(input).reverse()
    for (let i = 0, length = directUpdates.length; i < length; i++) {
      const item = directUpdates[i]
      if (sorted.indexOf(item) === -1) {
        sorted.push(item)
      }
    }

    return sorted
  },
  hmrApply(files: Array<string>) {
    const updateOrder = this.hmrGetOrder(files)
    for (let i = 0, length = updateOrder.length; i < length; i++) {
      const file = updateOrder[i]
      const oldModule = this.cache[file]
      const newModule = this.getModule(oldModule.id, oldModule.callback)
      oldModule.hot.callbacks_dispose.forEach(function(callback) {
        callback(newModule.hot.data)
      })
      this.cache[file] = newModule
      newModule.callback.call(newModule.exports, newModule.id, '/', this.generateRequire(null), newModule, newModule.exports)
      newModule.hot.callbacks_accept.forEach(function(callback) {
        callback()
      })
    }
  },
}
