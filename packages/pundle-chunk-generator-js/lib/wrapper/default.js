const global = (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

const sbPundle = global.sbPundle || {
  cache: {},
  chunks: {},
  entries: {},
}
if (!global.sbPundle) {
  global.sbPundle = sbPundle
}

const sbPundleCache = sbPundle.cache
const sbPundleChunks = sbPundle.chunks
function sbPundleModuleRegister(moduleId, callback) {
  sbPundleCache[moduleId] = {
    id: moduleId,
    invoked: false,
    callback,
    exports: {},
    parents: sbPundleCache[moduleId] ? sbPundleCache[moduleId].parents : [],
  }
}
function sbPundleChunkLoaded(id, entry) {
  if (sbPundleChunks[id]) {
    sbPundleChunks[id].resolve(entry)
  } else {
    sbPundleChunks[id] = {
      promise: Promise.resolve(entry),
    }
  }
}
function sbPundleModuleRequire(from, request) {
  const module = sbPundleCache[request]
  if (!module) {
    throw new Error(`Module '${request}' not found. Did you forget to load the parent chunks before this one?`)
  }
  if (module.parents.indexOf(from) === -1 && from !== '$root') {
    module.parents.push(from)
  }
  if (!module.invoked) {
    module.invoked = true
    module.callback.call(module.exports, module, sbPundleModuleGenerate(request), module.exports, module.id, '')
  }
  return module.exports
}
function sbPundleModuleGenerate(from) {
  const require = sbPundleModuleRequire.bind(null, from)
  require.cache = sbPundleCache
  require.resolve = path => path
  require.chunk = id => {
    // TOOD: Append as a script to page if not present already
    let deferred = sbPundleChunks[id]
    if (!deferred) {
      deferred = {}
      sbPundleChunks[id] = deferred
      deferred.promise = new Promise(function(resolve) {
        deferred.resolve = resolve
      })
    }
    return deferred.promise
  }
  return require
}
