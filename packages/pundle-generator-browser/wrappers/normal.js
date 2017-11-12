const global = (PUNDLE_USE_GLOBALS && typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

global.root = global.root || root
global.GLOBAL = global.GLOBAL || GLOBAL
global.global = global.global || global

const sbPundle = {}
sbPundle.cache = {}
sbPundle.chunks = { map: {}, loading: {} }
sbPundle.registerMap = function(map) {
  for (const key in map) {
    sbPundle.chunks.map[key] = map[key]
  }
}
sbPundle.registerChunk = function(id) {
  const callback = sbPundle.chunks.loading[id]
  if (callback) callback()
}
sbPundle.moduleRegister = function(moduleId, callback) {
  this.cache[moduleId] = {
    id: moduleId,
    invoked: false,
    callback,
    exports: {},
    parents: [],
  }
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
    const dirname = module.id
      .split('/')
      .slice(0, -1)
      .join('/')
    module.callback.call(
      module.exports,
      module.id,
      dirname,
      sbPundle.moduleRequireGenerate(module.id),
      module,
      module.exports,
    )
  }
  return module.exports
}
sbPundle.moduleRequireGenerate = function(from) {
  const require = sbPundle.moduleRequire.bind(this, from)
  require.cache = sbPundle.cache
  require.resolve = path => path
  require.import = id => {
    console.log('id', id)
    throw new Error('Unimplemented!')
  }
  return require
}
// Share with other instances - Required for chunks to work - Respects PUNDLE_USE_GLOBALS
global.sbPundle = global.sbPundle || sbPundle
export default global.sbPundle
