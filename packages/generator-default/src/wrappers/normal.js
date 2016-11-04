/* @flow */

type Module = {
  id: string,
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
  extensions: [],
  resolve(path) { return path },
}

function __sb_pundle_register(filePath, callback) {
  if (__sb_pundle.cache[filePath]) {
    __sb_pundle.cache[filePath].callback = callback
  } else {
    const module: Module = {
      id: filePath,
      filePath,
      callback,
      exports: __SB_PUNDLE_DEFAULT_EXPORT,
      parents: [],
    }
    __sb_pundle.cache[filePath] = module
  }
}

function __sb_pundle_require_module(fromModule: string, request: string) {
  if (!(request in __sb_pundle.cache)) {
    throw new Error('Module not found')
  }
  const module = __sb_pundle.cache[request]
  if (module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
    module.parents.push(fromModule)
  }
  if (module.exports === __SB_PUNDLE_DEFAULT_EXPORT) {
    module.exports = {}
    module.callback.call(module.exports, fromModule, fromModule, __sb_generate_require(fromModule), module, module.exports)
  }
  return module.exports
}
function __sb_generate_require(moduleName: string) {
  const bound = __sb_pundle_require_module.bind(null, moduleName)
  bound.cache = __sb_pundle.cache
  bound.extensions = __sb_pundle.extensions
  bound.resolve = __sb_pundle.resolve
  return bound
}
const __sb_require = __sb_generate_require('$root')
