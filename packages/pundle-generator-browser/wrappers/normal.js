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
sbPundle.registerChunk = function(id, entryFile) {
  const result = entryFile ? sbPundle.moduleRequire('$root', entryFile) : null
  const loader = sbPundle.chunks.loading[id]
  if (loader) loader.resolve(result)
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
    const deferred = {}
    deferred.promise = new Promise(function(resolve) {
      deferred.resolve = resolve
    })

    const label = sbPundle.chunks.map[id]
    const loading = sbPundle.chunks.loading
    if (!label) throw new Error(`No registered chunk found for module: ${label}`)
    loading[label] = deferred

    const script = document.createElement('script')
    script.src = `${PUNDLE_PUBLIC_DIRECTORY}/${label}.js`
    // TODO: Fix this for web workers
    document.body.appendChild(script)

    return deferred.promise
  }
  return require
}
// Share with other instances - Required for chunks to work - Respects PUNDLE_USE_GLOBALS
global.sbPundle = global.sbPundle || sbPundle
export default global.sbPundle
