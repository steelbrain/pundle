'use strict';

var global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {},
    GLOBAL = global,
    root = global,
    __SB_PUNDLE_DEFAULT_EXPORT = {},
    __sb_pundle = {
  cache: {},
  extensions: ['.js'],
  resolve: function resolve(path) {
    return path;
  }
};

function __sb_pundle_register(filePath, callback) {
  if (__sb_pundle.cache[filePath]) {
    __sb_pundle.cache[filePath].callback = callback;
  } else {
    __sb_pundle.cache[filePath] = {
      id: filePath,
      filePath: filePath,
      callback: callback,
      exports: __SB_PUNDLE_DEFAULT_EXPORT,
      parents: []
    };
  }
}

function __sb_pundle_require_module(fromModule, request) {
  if (!(request in __sb_pundle.cache)) {
    throw new Error('Module not found');
  }
  var module = __sb_pundle.cache[request];
  if (module.parents.indexOf(fromModule) === -1 && fromModule !== '$root') {
    module.parents.push(fromModule);
  }
  if (module.exports === __SB_PUNDLE_DEFAULT_EXPORT) {
    module.exports = {};
    module.callback.call(module.exports, module, module.exports);
  }
  return module.exports;
}
function __sb_generate_require(moduleName) {
  var bound = __sb_pundle_require_module.bind(null, moduleName);
  bound.cache = __sb_pundle.cache;
  bound.extensions = __sb_pundle.extensions;
  bound.resolve = __sb_pundle.resolve;
  return bound;
}
var __require = __sb_generate_require('$root');