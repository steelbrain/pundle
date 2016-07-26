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

function __sb_pundle_hot() {
  this.accepts = new Set()
  this.declines = new Set()
  this.accept_callbacks = new Set()
  this.dispose_callbacks = new Set()
}
__sb_pundle_hot.prototype.accept = function(a, b) {
  if (arguments.length == 0) {
    this.accepts.add('*')
  } else if (typeof a === 'function') {
    this.accepts.add('*')
    this.accept_callbacks.add(a)
  } else if (typeof a === 'string') {
    this.accepts.add(a)
    if (typeof b === 'function') {
      this.accept_callbacks.add(b)
    }
  }
}
__sb_pundle_hot.prototype.decline = function(a) {
  if (arguments.length === 0) {
    this.declines.add('*')
  } else if (typeof a === 'string') {
    this.declines.add(a)
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

function __sb_pundle_apply_hmr_single(filePath, appliedTo) {
  if (appliedTo.has(filePath)) {
    return
  }

  var module = __require.cache[filePath]
  var hot = module.hot
  if (hot.declines.has('*') || hot.declines.has(filePath)) {
    console.log('[HMR] declined by', filePath)
    location.reload()
    return
  }
  appliedTo.add(filePath)

  module.hot = new __sb_pundle_hot()
  try {
    hot.dispose_callbacks.forEach(function(dispose_callback) {
      dispose_callback(module.hot.data)
    })
    hot.accept_callbacks.forEach(function(accept_callback) {
      accept_callback(filePath)
    })
  } catch (_) {
    module.hot = hot
    throw _
  }
  if (hot.accepts.has('*') || hot.accepts.has(filePath)) {
    if (hot.accept_callbacks.size) {
      return
     }
  }
  module.exports = {}
  __sb_pundle.cache[filePath].callback.call(module.exports, module, module.exports)
  module.parents.forEach(function(parent) {
    __sb_pundle_apply_hmr(parent, appliedTo)
  })
}
function __sb_pundle_apply_hmr(applyTo) {
  for (var i = 0, length = applyTo.length; i < length; ++i) {
    __sb_pundle_apply_hmr_single(applyTo[i], new Set())
  }
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
  var bound = __sb_pundle_require_module.bind(null, moduleName)
  bound.cache = __sb_pundle.cache
  bound.extensions = __sb_pundle.extensions
  bound.resolve = __sb_pundle.resolve
  return bound
}
var __require = __sb_generate_require('$root');
