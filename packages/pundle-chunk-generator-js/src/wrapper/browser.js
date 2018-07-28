const global = (typeof self !== 'undefined' && self) || {}
const GLOBAL = global
const root = global

const sbPundle = global.sbPundle || {
  cache: {},
  chunks: {},
  entries: {},
  moduleHooks: [],
}
if (!global.sbPundle) {
  global.sbPundle = sbPundle
}
let sbChunkId = ''
let sbPundleServer = ''
if (typeof document !== 'undefined' && document.currentScript) {
  const parsed = new URL(document.currentScript.src)
  sbPundleServer = `${parsed.protocol}//${parsed.host}`
}

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
  const scopedRequire = sbPundleModuleRequire.bind(null, from)
  scopedRequire.cache = sbPundleCache
  scopedRequire.resolve = path => path
  scopedRequire.chunk = (chunkId, fileId) => {
    let deferred = sbPundleChunks[chunkId]
    if (!deferred) {
      deferred = {}
      sbPundleChunks[chunkId] = deferred
      deferred.promise = new Promise(function(resolve) {
        deferred.resolve = resolve
      })
      const script = document.createElement('script')
      script.type = 'application/javascript'
      script.src = `${sbPundleServer}${chunkId}`
      if (document.body) {
        document.body.appendChild(script)
      } else {
        document.appendChild(script)
      }
    }
    return deferred.promise.then(() => scopedRequire(fileId))
  }
  return scopedRequire
}
