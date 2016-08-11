/* @flow */

type Module = {
  id: string,
  hot: __sb_pundle_hot,
  filePath: string,
  callback: Function,
  exports: Object,
  parents: Array<string>,
}

const global = (typeof window !== 'undefined' && window) || (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global
const __SB_PUNDLE_DEFAULT_EXPORT = {}
const __sb_pundle = {
  cache: {},
  extensions: ['.js'],
  resolve(path) { return path },
}
let __require

class __sb_pundle_hot {
  data: Object;
  accepts: Set<string>;
  declines: Set<string>;
  callbacks_accept: Set<{ clause: string, callback: Function }>;
  callbacks_dispose: Set<Function>;
  constructor() {
    this.data = {}
    this.accepts = new Set()
    this.declines = new Set()
    this.callbacks_accept = new Set()
    this.callbacks_dispose = new Set()
  }
  accept(a, b) {
    const clause = typeof a === 'string' ? a : '*'
    const callback = (typeof a === 'function' && a) || (typeof b === 'function' && b) || null

    this.accepts.add(clause)
    if (callback) {
      this.callbacks_accept.add({ clause, callback })
    }
  }
  decline(path: ?string = null) {
    this.declines.add(typeof path === 'string' ? path : '*')
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

function __sb_pundle_hmr_is_accepted(id, givenMatchAgainst) {
  const module = __sb_pundle.cache[id]
  const matchAgainst = givenMatchAgainst || id
  return module && (
    ((module.hot.accepts.has('*') || module.hot.accepts.has(matchAgainst)) && 1) ||
    (
      module.parents.some(function(entry) {
        return __sb_pundle_hmr_is_accepted(entry, matchAgainst)
      }) && 2
    )
  )
}

function __sb_pundle_hmr_get_update_order(applyTo) {
  const unresolved = [].concat(applyTo)
  const resolved = []
  while (unresolved.length) {
    let i = unresolved.length
    let passed = true
    let foundOne = false
    const toRemove = []
    while (i--) {
      const id = unresolved[i]
      const module = __sb_pundle.cache[id]
      const acceptanceStatus = __sb_pundle_hmr_is_accepted(id)
      if (!module || (applyTo.indexOf(id) !== -1 && !acceptanceStatus)) {
        passed = false
      }
      const parentsResolved = !module.parents.length || module.parents.every(function(parent) {
        return resolved.indexOf(parent) !== -1
      })
      if (acceptanceStatus === 1 || parentsResolved) {
        foundOne = true
        resolved.push(id)
        toRemove.push(id)
      } else if (acceptanceStatus === 2) {
        for (let j = 0, length = module.parents.length; j < length; ++j) {
          const parent = module.parents[j]
          if (resolved.indexOf(parent) === -1 && unresolved.indexOf(parent) === -1) {
            foundOne = true
            unresolved.push(parent)
          }
        }
      }
    }
    for (let j = 0, length = toRemove.length; j < length; ++j) {
      unresolved.splice(unresolved.indexOf(toRemove[j]), 1)
    }
    if (!passed || !foundOne) {
      const error = new Error('Unable to apply HMR. Page refresh will be required')
      // $FlowIgnore: Custom error property
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }
  }
  return resolved.reverse()
}

function __sb_pundle_hmr_apply(applyTo) {
  const modules = __sb_pundle_hmr_get_update_order(applyTo)
  for (let i = 0, length = modules.length; i < length; ++i) {
    const id = modules[i]
    const module: Module = __sb_pundle.cache[id]
    const data = {}
    const oldHot = module.hot
    oldHot.callbacks_dispose.forEach(function(callback) {
      callback(data)
    })
    module.exports = {}
    module.hot = new __sb_pundle_hot()
    __sb_pundle.cache[id].callback.call(module.exports, module, module.exports)
    oldHot.callbacks_accept.forEach(function({ clause, callback }) {
      if (clause === '*' || modules.indexOf(clause) !== -1) {
        callback()
      }
    })
  }
}

function __sb_pundle_register(filePath, callback) {
  if (__sb_pundle.cache[filePath]) {
    __sb_pundle.cache[filePath].callback = callback
  } else {
    const module: Module = {
      id: filePath,
      hot: new __sb_pundle_hot(),
      filePath,
      callback,
      exports: __SB_PUNDLE_DEFAULT_EXPORT,
      parents: [],
    }
    __sb_pundle.cache[filePath] = module
  }
}

function __sb_pundle_require_module(fromModule, request) {
  if (!(request in __sb_pundle.cache)) {
    throw new Error('Module not found')
  }
  const module = __sb_pundle.cache[request]
  if (module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
    module.parents.push(fromModule)
  }
  if (module.exports === __SB_PUNDLE_DEFAULT_EXPORT) {
    module.exports = {}
    module.callback.call(module.exports, module, module.exports)
  }
  return module.exports
}
function __sb_generate_require(moduleName) {
  const bound = __sb_pundle_require_module.bind(null, moduleName)
  bound.cache = __sb_pundle.cache
  bound.extensions = __sb_pundle.extensions
  bound.resolve = __sb_pundle.resolve
  return bound
}
__require = __sb_generate_require('$root');
