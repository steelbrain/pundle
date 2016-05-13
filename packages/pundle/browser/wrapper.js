var __sb_pundle = { module_sources: {} }
var global = typeof window !== 'undefined' ? window : (
  typeof self !== 'undefined' ? self : {}
)
var root = global
var GLOBAL = root
var __require
function __sb_pundle_register(filePath, callback) {
  __sb_pundle.module_sources[filePath] = callback
}
function __sb_pundle_require(moduleName) {
  function _require(request) {
    var module
    if (request in __require.cache) {
      __require.cache[request].parents.add(moduleName)
      return __require.cache[request].exports
    }
    module = {
       exports: {},
       id: request,
       parents: new Set([moduleName])
    }
    __require.cache[request] = module
    __sb_pundle.module_sources[request].call(module.exports, module, module.exports)
    return module.exports
  }
  Object.assign(_require, __sb_pundle_require)
  return _require
}
__sb_pundle_require.resolve = function(dependency) {
  return dependency
}
__sb_pundle_require.cache = []
__sb_pundle_require.extensions = []
__require = __sb_pundle_require('$internal')
