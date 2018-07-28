const sbPundle = global.sbPundle || {
  cache: {},
  chunks: {},
  entries: {},
  moduleHooks: [],
}
const sbPundlePath = require('path')

if (!global.sbPundle) {
  global.sbPundle = sbPundle
}
let sbChunkId = ''

const sbPundleCache = sbPundle.cache
const sbPundleChunks = sbPundle.chunks
function sbPundleModuleRegister(moduleId, callback) {
  const newModule = {
    id: moduleId,
    invoked: false,
    callback,
    exports: {},
    parents: sbPundleCache[moduleId] ? sbPundleCache[moduleId].parents : [],
  }
  sbPundleCache[moduleId] = newModule
  if (sbPundle.moduleHooks.length) {
    sbPundle.moduleHooks.forEach(moduleHook => {
      moduleHook(newModule)
    })
  }
}
function sbPundleChunkLoading(id) {
  sbChunkId = id
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
    // In case it's core, it'll work
    // Otherwise it'll throw - what we want
    return require(request)
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
  const scopedRequire = sbPundleModuleRequire.bind(null, from)
  scopedRequire.cache = sbPundleCache
  scopedRequire.resolve = path => path
  scopedRequire.chunk = (chunkId, fileId) => {
    // TOOD: Append as a script to page if not present already
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
        deferred.resolve()
      })
    }
    return deferred.promise.then(() => scopedRequire(fileId))
  }
  return scopedRequire
}
