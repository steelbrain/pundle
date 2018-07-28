const sbPundle = {
  chunks: {},
  entries: {},
}

let sbChunkId = ''
const sbPundlePath = require('path')
const sbPundleModule = require('module')

const sbPundleChunks = sbPundle.chunks
function sbPundleModuleRegister(moduleId, callback) {
  const newModule = new sbPundleModule(moduleId, '.')
  newModule.load = function() {
    callback.call(newModule.exports, newModule.exports, sbPundleModuleGenerate(moduleId), newModule, newModule.id, '')
    newModule.loaded = true
  }
  newModule.pundle = true
  sbPundleModule._cache[moduleId] = newModule
}
function sbPundleChunkLoading(id) {
  sbChunkId = id
}
function sbPundleChunkLoaded(id, entry) {
  /* No op */
}
function sbPundleModuleRequire(from, request) {
  const cached = sbPundleModule._cache[request]
  if (cached) {
    if (cached.loaded) {
      return cached.exports
    } else if (cached.pundle) {
      cached.load()
      return cached.exports
    }
  }
  return require(request)
}
function sbPundleModuleGenerate(from) {
  const scopedRequire = sbPundleModuleRequire.bind(null, from)
  scopedRequire.cache = sbPundleModule.cache
  scopedRequire.resolve = path => path
  scopedRequire.chunk = (chunkId, fileId) => {
    let deferred = sbPundleChunks[chunkId]
    if (!deferred) {
      deferred = {}
      sbPundleChunks[chunkId] = deferred
      deferred.promise = new Promise(function(resolve) {
        deferred.resolve = resolve
      })
      let relativeNodePath = sbPundlePath.relative(sbPundlePath.dirname(sbChunkId), chunkId)
      if (relativeNodePath[0] !== '.') relativeNodePath = `./${relativeNodePath}`
      process.nextTick(function() {
        require(relativeNodePath)
        deferred.resolve(scopedRequire(fileId))
      })
    }
    return deferred.promise
  }
  return scopedRequire
}
