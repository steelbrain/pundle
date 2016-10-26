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
const __sb_pundle_hmr_topological_sort = function(){function n(n,r){function e(f,u,d){if(d.indexOf(f)>=0)throw new Error("Cyclic dependency: "+JSON.stringify(f));if(!~n.indexOf(f))throw new Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: "+JSON.stringify(f));if(!t[u]){t[u]=!0;var a=r.filter(function(n){return n[0]===f});if(u=a.length){var c=d.concat(f);do{var l=a[--u][1];e(l,n.indexOf(l),c)}while(u)}i[--o]=f}}for(var o=n.length,i=new Array(o),t={},f=o;f--;)t[f]||e(n[f],f,[]);return i}function r(n){for(var r=[],e=0,o=n.length;o>e;e++){var i=n[e];r.indexOf(i[0])<0&&r.push(i[0]),r.indexOf(i[1])<0&&r.push(i[1])}return r}return function(e){return n(r(e),e)}}();
/* eslint-enable */

class __sb_pundle_hot {
  data: Object;
  accepts: Set<string>;
  declines: Set<string>;
  callbacks_accept: Set<{ clause: string, callback: Function }>;
  callbacks_dispose: Set<Function>;
  constructor(data) {
    this.data = data
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

function __sb_pundle_hmr_get_update_order(updatedModules) {
  const input = []
  const added = new Set()
  const failed = []
  const duplicates = []

  function iterate(from, parents) {
    if (added.has(from)) {
      return
    }
    added.add(from)
    for (let i = 0, length = parents.length; i < length; ++i) {
      const parent = parents[i]
      if (added.has(parent)) {
        continue
      }
      const acceptanceStatus = __sb_pundle_hmr_is_accepted(parent)
      if (!acceptanceStatus) {
        failed.push(parent)
        continue
      }

      const parentModule = __sb_pundle.cache[parent]
      if (added.has(`${from}-${parent}`) || added.has(`${parent}-${from}`)) {
        duplicates.push([from, parent])
        continue
      }
      added.add(`${from}-${parent}`)
      input.push([parent, from])
      if (acceptanceStatus === 2 && parentModule.parents.length) {
        iterate(parent, parentModule.parents)
      }
    }
  }

  for (let i = 0, length = updatedModules.length; i < length; ++i) {
    const updated = updatedModules[i]
    const updatedModule = __sb_pundle.cache[updated]
    if (!__sb_pundle_hmr_is_accepted(updated)) {
      failed.push(updated)
      continue
    }
    if (!added.has(updated) && updatedModule.parents.length) {
      iterate(updated, updatedModule.parents)
    }
  }
  if (duplicates.length) {
    console.log('[HMR] Error: Update could not be applied because these modules require each other:\n' + duplicates.map(item => `  • ${item[0]} <--> ${item[0]}`).join('\n'))
    const error: Object = new Error('Unable to apply HMR because some modules require their parents')
    error.code = 'HMR_REBOOT_REQUIRED'
    throw error
  }
  if (failed.length) {
    console.log('[HMR] Error: Update could not be applied because these did not accept:\n' + failed.map(item => `  • ${item}`).join('\n'))
    const error: Object = new Error('Unable to apply HMR because some modules didnt accept it')
    error.code = 'HMR_REBOOT_REQUIRED'
    throw error
  }
  return __sb_pundle_hmr_topological_sort(input).reverse()
}

function __sb_pundle_hmr_apply(updatedModules) {
  const modules = __sb_pundle_hmr_get_update_order(updatedModules)
  for (let i = 0, length = modules.length; i < length; ++i) {
    const id = modules[i]
    const module: Module = __sb_pundle.cache[id]
    const data = {}
    const oldHot = module.hot
    oldHot.callbacks_dispose.forEach(function(callback) {
      callback(data)
    })
    module.exports = {}
    module.hot = new __sb_pundle_hot(data)
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
      hot: new __sb_pundle_hot({}),
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
