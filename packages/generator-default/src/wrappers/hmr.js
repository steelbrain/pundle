/* @flow */

import __sbPundle_hmrSort from '../../lib/wrappers/dep-hmr-sort.js'
import __sbPundle_hmrAnsi from '../../lib/wrappers/dep-hmr-ansi.js'
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
  cache: {},
  extensions: [],
  resolutionMap: {},
  resolve: function(path) {
    return path
  },
  getModule: function(moduleId, callback) {
    return {
      id: moduleId,
      hot: new __sbPundle_HMR(),
      callback: callback,
      invoked: false,
      exports: {},
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
  requireModule: function(fromModule: ?string, givenRequest: string) {
    const request = this.resolutionMap[givenRequest] || givenRequest
    const module: ?ModuleNormal = this.cache[request]
    if (!module) {
      throw new Error('Module not found')
    }
    if (fromModule && module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
      module.parents.push(fromModule)
    }
    if (!module.invoked) {
      module.invoked = true
      module.callback.call(module.exports, module.id, '/', this.generateRequire(module.id), module, module.exports)
    }
    return module.exports
  },
  generateRequire: function(fromModule: ?string) {
    const require = this.requireModule.bind(this, fromModule)
    require.cache = this.cache
    require.extensions = this.extensions
    require.resolve = this.resolve
    return require
  },
  require: function(request: string) {
    return this.requireModule('$root', request)
  },
  hmrSort: eval(__sbPundle_hmrSort),
  ansiToHtml: eval(__sbPundle_hmrAnsi),
  hmrIsAccepted: function(moduleId: string, matchAgainst: string = moduleId): 'no' | 'direct' | 'parent' {
    const module = this.cache[moduleId]
    if (module.hot.accepts.has('*') || module.hot.accepts.has(matchAgainst)) {
      return 'direct'
    }
    if (module.parents.some(i => this.hmrIsAccepted(i, matchAgainst) !== 'no')) {
      return 'parent'
    }
    return 'no'
  },
  hmrGetOrder: function(files: Array<string>): Array<string> {
    const input: Array<[string, string]> = []
    const added: Set<string> = new Set()
    const failed: Array<string> = []
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
  hmrApply: function(givenFiles: Array<string>, newFiles: Array<string>) {
    const files = givenFiles.filter(file => !~newFiles.indexOf(file))
    const updateOrder = this.hmrGetOrder(files)
    const hmrDebugging = __sbPundle.debugHMR
    if (hmrDebugging) {
      console.log('[HMR] Update order is', updateOrder)
    }
    for (let i = 0, length = updateOrder.length; i < length; i++) {
      const file = updateOrder[i]
      const oldModule = this.cache[file]
      const newModule = this.getModule(oldModule.id, oldModule.callback)
      if (hmrDebugging) {
        console.log('[HMR] Updating', file)
      }
      oldModule.hot.callbacks_dispose.forEach(function(callback) {
        callback(newModule.hot.data)
      })
      this.cache[file] = newModule
      newModule.parents = oldModule.parents
      try {
        newModule.invoked = true
        newModule.callback.call(newModule.exports, newModule.id, '/', this.generateRequire(null), newModule, newModule.exports)
      } catch (error) {
        // NOTE: In case of error, copy last HMR info
        Object.assign(newModule.hot, {
          accepts: oldModule.hot.accepts,
          declines: oldModule.hot.declines,
          callbacks_accept: oldModule.hot.callbacks_accept,
          callbacks_dispose: oldModule.hot.callbacks_dispose,
        })
        throw error
      }
      newModule.hot.callbacks_accept.forEach(function(callback) {
        callback()
      })
    }
  },
  get debugHMR() {
    return !!localStorage.getItem('__sbPundleDebugHMR')
  },
  set debugHMR(value) {
    if (value) {
      localStorage.setItem('__sbPundleDebugHMR', 'true')
    } else {
      localStorage.removeItem('__sbPundleDebugHMR')
    }
  },
}
