const global = (PUNDLE_USE_GLOBALS && typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

global.root = global.root || root
global.GLOBAL = global.GLOBAL || GLOBAL
global.global = global.global || global

const sbPundle = {}
sbPundle.cache = {}
sbPundle.moduleMake = function(moduleId, callback) {
  return {
    id: moduleId,
    invoked: false,
    callback,
    exports: {},
    parents: [],
  }
}
sbPundle.moduleRegister = function(moduleId, callback) {
  this.cache[moduleId] = sbPundle.moduleMake(moduleId, callback)
}
sbPundle.moduleRequire = function(from, request) {
  const module = this.cache[request]
  if (!module) {
    throw new Error(`Module '${request}' not found. Did you forget to load the parent chunks before this one?`)
  }
  if (module.parents.indexOf(from) === -1 && from !== '$root') {
    module.parents.push(from)
  }
  if (!module.invoked) {
    module.invoked = true
    // TODO: Fix this __dirname
    module.callback.call(module.exports, module.id, '/', sbPundle.moduleRequireGenerate(module.id), module, module.exports)
  }
  return module.exports
}
sbPundle.moduleRequireGenerate = function(from) {
  const require = sbPundle.moduleRequire.bind(this, from)
  require.cache = sbPundle.cache
  require.resolve = path => path
  require.import = () => {
    throw new Error('Unimplemented!')
  }
  return require
}
// Share with other instances - Required for chunks to work - Respects PUNDLE_USE_GLOBALS
global.sbPundle = global.sbPundle || sbPundle
export default global.sbPundle
