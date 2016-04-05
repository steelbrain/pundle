'use strict';
var __sb_pundle = { modules: {}, module_sources: {} }
var global = window || self
function __sb_pundle_register(filePath, callback) {
  __sb_pundle.module_sources[filePath] = callback
}
function require(request) {
  var module
  if (request in __sb_pundle.modules) {
    return __sb_pundle.modules[request]
  }
  module = { exports: {} }
  __sb_pundle.module_sources[request].call(module.exports, module, module.exports)
  __sb_pundle.modules[request] = module.exports || {}
  return __sb_pundle.modules[request]
}
require.resolve = function(dependency) {
  return dependency
}
