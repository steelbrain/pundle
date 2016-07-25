var
  global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {},
  GLOBAL = global,
  root = global,
  __SB_PUNDLE_DEFAULT_EXPORT = {},
  __sb_pundle = {
    cache: {},
    extensions: ['.js'],
    resolve: function(path) { return path },
  }

function __sb_pundle_apply_hmr() {
  console.log('TODO: APPLY HMR')
}

function __sb_pundle_hot() {
  this.accepts = new Set()
  this.declines = new Set()
  this.accept_callbacks = new Set()
  this.dispose_callbacks = new Set()
}
__sb_pundle_hot.prototype.accept = function(a, b) {
  if (typeof a === 'function') {
    this.accepts.add('*')
    this.accept_callbacks.add(a)
  } else if ((typeof a === 'string' || Array.isArray(a))) {
    var entries = [].concat(a)
    for (var i = 0, length = entries.length; i < length; ++i) {
      this.accepts.add(entries[i])
    }
    if (typeof b === 'function') {
      this.accept_callbacks.add(b)
    }
  }
}
__sb_pundle_hot.prototype.decline = function(a) {
  if (typeof a === 'string' || Array.isArray(a)) {
    var entries = [].concat(a)
    for (var i = 0, length = entries.length; i < length; ++i) {
      this.declines.add(entries[i])
    }
  } else {
    this.declines.add('*')
  }
}
__sb_pundle_hot.prototype.dispose = function(_) {
  this.dispose_callbacks.add(_)
}
__sb_pundle_hot.prototype.addDisposeHandler = function(_) {
  this.dispose_callbacks.add(_)
}
__sb_pundle_hot.prototype.removeDisposeHandler = function(_) {
  this.dispose_callbacks.delete(_)
}

function __sb_pundle_register(filePath, callback) {
  if (__sb_pundle.cache[filePath]) {
    __sb_pundle.cache[filePath].callback = callback
  } else {
    __sb_pundle.cache[filePath] = {
      id: filePath,
      hot: new __sb_pundle_hot(),
      filePath: filePath,
      callback: callback,
      exports: __SB_PUNDLE_DEFAULT_EXPORT,
      parents: [],
    }
  }
}

function __sb_pundle_require_module(fromModule, request) {
  if (!(request in __sb_pundle.cache)) {
    throw new Error('Module not found')
  }
  var module = __sb_pundle.cache[request]
  if (module.parents.indexOf(fromModule) === -1) {
    module.parents.push(fromModule)
  }
  if (module.exports === __SB_PUNDLE_DEFAULT_EXPORT) {
    module.exports = {}
    module.callback.call(module.exports, module, module.exports)
  }
  return module.exports
}
function __sb_generate_require(moduleName) {
  var bound = __sb_pundle_require_module.bind(null, moduleName)
  bound.cache = __sb_pundle.cache
  bound.extensions = __sb_pundle.extensions
  bound.resolve = __sb_pundle.resolve
  return bound
}
var __require = __sb_generate_require('$internal')
