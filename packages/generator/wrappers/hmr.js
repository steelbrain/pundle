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

/* eslint-disable */
/**
 * Topological sorting function
 * @source https://github.com/marcelklehr/toposort/blob/de225fa7d55bb699dc927455ab0d1a3897d9d7b4/index.js
 * @license MIT
 */
const __sb_pundle_hmr_topo_sort = function(){function n(n,r){function e(f,u,d){if(d.indexOf(f)>=0)throw new Error("Cyclic dependency: "+JSON.stringify(f));if(!~n.indexOf(f))throw new Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: "+JSON.stringify(f));if(!t[u]){t[u]=!0;var a=r.filter(function(n){return n[0]===f});if(u=a.length){var c=d.concat(f);do{var l=a[--u][1];e(l,n.indexOf(l),c)}while(u)}i[--o]=f}}for(var o=n.length,i=new Array(o),t={},f=o;f--;)t[f]||e(n[f],f,[]);return i}function r(n){for(var r=[],e=0,o=n.length;o>e;e++){var i=n[e];r.indexOf(i[0])<0&&r.push(i[0]),r.indexOf(i[1])<0&&r.push(i[1])}return r}return function(e){return n(r(e),e)}}();
/* eslint-enable */

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

function __sb_pundle_hmr_debug_inter_requires(unresolved) {
  // Helper function to get a list of functions that require their parents
  const added = new Set()
  const toReturn = []
  for (let i = 0, length = unresolved.length; i < length; ++i) {
    const child = unresolved[i]
    const childModule = __sb_pundle.cache[child]

    for (let _i = 0, _length = childModule.parents.length; _i < _length; ++_i) {
      const parent = childModule.parents[_i]
      const parentModule = __sb_pundle.cache[parent]

      for (let __i = 0, __length = parentModule.parents.length; __i < __length; ++__i) {
        const item = parentModule.parents[__i]
        if (item === child && !added.has(`${parent}-${child}`) && !added.has(`${child}-${parent}`)) {
          added.add(`${parent}-${child}`)
          toReturn.push({ a: child, b: parent })
        }
      }
    }
  }
  return toReturn
}

function __sb_pundle_hmr_module_info(id) {
  return {
    id,
    parents: __sb_pundle.cache[id].parents.slice(),
  }
}

function __sb_pundle_hmr_get_update_order(applyTo) {
  const unresolved = [].concat(applyTo).map(__sb_pundle_hmr_module_info)
  const resolved = []
  while (unresolved.length) {
    let i = unresolved.length
    let passed = true
    let foundOne = false
    const toRemove = []
    while (i--) {
      const module = unresolved[i]
      const acceptanceStatus = __sb_pundle_hmr_is_accepted(module.id)
      if (!module || (applyTo.indexOf(module.id) !== -1 && !acceptanceStatus)) {
        passed = false
      }
      const parentsResolved = !module.parents.length || module.parents.every(function(parent) {
        return resolved.indexOf(parent) !== -1
      })
      if (acceptanceStatus === 1 || parentsResolved) {
        foundOne = true
        resolved.push(module)
        toRemove.push(module)
      } else if (acceptanceStatus === 2) {
        for (let j = 0, length = module.parents.length; j < length; ++j) {
          const parent = module.parents[j]
          if (resolved.indexOf(parent) === -1 && unresolved.indexOf(parent) === -1) {
            foundOne = true
            unresolved.push(__sb_pundle_hmr_module_info(parent))
          }
        }
      }
    }
    for (let j = 0, length = toRemove.length; j < length; ++j) {
      unresolved.splice(unresolved.indexOf(toRemove[j]), 1)
    }
    if (!passed || !foundOne) {
      let message = 'Unable to apply HMR. Page refresh will be required'
      const interRequires = __sb_pundle_hmr_debug_inter_requires(unresolved)
      if (interRequires.length) {
        message = 'Unable to apply HMR because some modules require their parents'
        console.log('[HMR] Error: Update could not be applied because these modules require each other:\n' + interRequires.map(item => `  • ${item.a} <--> ${item.b}`).join('\n'))
      }
      const error: Object = new Error(message)
      error.code = 'HMR_REBOOT_REQUIRED'
      throw error
    }
  }
  return resolved.reverse()
}

function __sb_pundle_hmr_apply(applyTo) {
  const modules = __sb_pundle_hmr_get_update_order(applyTo)
  console.log('order', modules)
  if (true) {
    throw new Error()
  }
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
