var __sb_pundle = { module_sources: {} }
var global = typeof window !== 'undefined' ? window : (
  typeof self !== 'undefined' ? self : {}
)
var root = global
var GLOBAL = root
var __require
function __sb_pundle_apply_hmr(filePath, doNotReplace) {
  var module = __require.cache[filePath]
  var hot = module.hot
  if (hot.declines.has('*') || hot.declines.has(filePath)) {
    console.log('[HMR] declined by', filePath)
    location.reload()
    return
  }

  if (hot.accepts.has('*') || hot.accepts.has(filePath)) {
    try {
      module.hot = new __sb_pundle_hot()
      hot.dispose_callbacks.forEach(function(dispose_callback) {
        dispose_callback(module.hot.data)
      })
      if (hot.accept_callbacks.size) {
        hot.accept_callbacks.forEach(function(accept_callback) {
          accept_callback(filePath)
        })
        return
      }
      doNotReplace = false
    } catch (_) {
      module.hot = hot
      throw _
    }
  }
  if (!doNotReplace) {
    __sb_pundle.module_sources[filePath].call(module.exports, module, module.exports, __sb_pundle_require(filePath))
  }
  module.parents.forEach(function(parent) {
    if (parent === '$root') {
      return
    }
    __sb_pundle_apply_hmr(parent, true)
  })
}
function __sb_pundle_register(filePath, callback) {
  __sb_pundle.module_sources[filePath] = callback
}
function __sb_pundle_hot() {
  this.accepts = new Set()
  this.declines = new Set()
  this.accept_callbacks = new Set()
  this.dispose_callbacks = new Set()
  this.data = {}
}
__sb_pundle_hot.prototype.accept = function(_, __) {
  if (typeof _ === 'function') {
    this.accepts.add('*')
    this.accept_callbacks.add(_)
  } else {
    var added = false
    if (typeof _ === 'string') {
      this.accepts.add(_)
      added = true
    } else if (Array.isArray(_)) {
      for (var i = 0, length = _.length; i < length; ++i) {
        this.accepts.add(_[i])
      }
      added = true
    }
    if (typeof __ === 'function') {
      this.accept_callbacks.add(__)
      if (!added) {
        this.accepts.add('*')
      }
    } else if (!added && typeof __ === 'undefined') {
      this.accepts.add('*')
    }
  }
}
__sb_pundle_hot.prototype.decline = function(_) {
  if (typeof _ === 'string') {
    this.declines.add(_)
  } else if (Array.isArray(_)) {
    for (var i = 0, length = _.length; i < length; ++i) {
      this.declines.add(_[i])
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
__sb_pundle_hot.prototype.check = function(_) {
  _(null)
}
__sb_pundle_hot.prototype.apply = function() {
  throw new Error()
}
__sb_pundle_hot.prototype.status = function(_) {
  if (typeof _ === 'function') {
    _('idle')
    return null
  }
  return 'idle'
}
__sb_pundle_hot.prototype.addStatusHandler = __sb_pundle_hot.prototype.removeStatusHandler = function() {}

function __sb_pundle_require(moduleName) {
  function _require(request) {
    var module
    if (request in __require.cache) {
      __require.cache[request].parents.add(moduleName)
      return __require.cache[request].exports
    }
    module = {
      id: request,
      hot: new __sb_pundle_hot(),
      exports: {},
      parents: new Set([moduleName])
    }
    __require.cache[request] = module
    __sb_pundle.module_sources[request].call(module.exports, module, module.exports, __sb_pundle_require(request))
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
__require = __sb_pundle_require('$root')
