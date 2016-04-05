'use strict';
var __sb_pundle = { module_sources: {} }
var global = typeof window !== 'undefined' ? window : (
  typeof self !== 'undefined' ? self : {}
)
function __sb_pundle_register(filePath, callback) {
  __sb_pundle.module_sources[filePath] = callback
}
function require(request) {
  var module
  if (request in require.cache) {
    return require.cache[request].exports
  }
  module = { exports: {}, id: request }
  require.cache[request] = module
  __sb_pundle.module_sources[request].call(module.exports, module, module.exports)
  return module.exports
}
require.resolve = function(dependency) {
  return dependency
}
require.cache = []
