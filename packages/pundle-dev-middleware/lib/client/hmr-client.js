import toposort from 'toposort'

const HMR_URL = `${document.currentScript.src}.pundle.hmr`

function isHMRAccepted(oldModules, moduleId, matchAgainst = moduleId) {
  const oldModule = oldModules[moduleId] || require.cache[moduleId]
  if (oldModule.hot.declined.includes('*') || oldModule.hot.declined.includes(matchAgainst)) {
    return 'no'
  }
  if (oldModule.hot.accepted.includes('*') || oldModule.hot.accepted.includes(matchAgainst)) {
    return 'direct'
  }
  if (oldModule.parents.some(item => isHMRAccepted(oldModules, item, matchAgainst) !== 'no')) {
    return 'parent'
  }
  return 'no'
}
function getHMROrder(oldModules, moduleIds) {
  let rejected = false
  const nodes = []

  function iterate(moduleId) {
    const hmrAccepted = isHMRAccepted(oldModules, moduleId)
    if (hmrAccepted === 'no') {
      rejected = true
    }

    const { parents } = oldModules[moduleId] || require.cache[moduleId]

    nodes.push([moduleId, null])
    if (hmrAccepted === 'direct') return

    parents.forEach(parent => {
      nodes.push([moduleId, parent])
      iterate(parent)
    })
  }
  moduleIds.forEach(iterate)
  if (rejected) {
    throw new Error(`HMR not applied because some modules rejected/did not accept it`)
  }

  // Remove null at the end
  return toposort(nodes).slice(0, -1)
}

function applyHMR(oldModules, moduleIds) {
  const updateOrder = getHMROrder(oldModules, moduleIds)
  updateOrder.forEach(moduleId => {
    const oldModule = oldModules[moduleId] || null
    const newModule = require.cache[moduleId]
    oldModule.hot.disposeHandlers.forEach(function(callback) {
      callback(newModule.hot.data)
    })
    try {
      sbPundleModuleRequire('$root', moduleId)
      oldModule.hot.successHandlers.forEach(function(callback) {
        callback()
      })
    } catch (error) {
      oldModule.hot.errorHandlers.forEach(callback => {
        callback(error)
      })
      throw error
    }
  })
}

async function handleResponse(response) {
  if (response.type === 'status') {
    const { enabled } = response
    console.info(`[HMR] ${enabled ? 'Connected to server' : 'Not allowed by server'}`)

    return
  }
  if (response.type === 'update') {
    const promises = []
    const oldModules = {}
    const { paths, changedFiles, changedModules } = response

    console.log(`[HMR] Affected files ${changedFiles.map(item => `${item.format}:${item.filePath}`).join(', ')}`)
    changedModules.forEach(moduleId => {
      oldModules[moduleId] = require.cache[moduleId]
    })

    paths.forEach(({ url, format }) => {
      if (format === 'js') {
        const script = document.createElement('script')
        script.type = 'application/javascript'
        script.src = url
        promises.push(
          new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
          }),
        )
        document.body.appendChild(script)
        return
      }
      if (format === 'css') {
        const link = document.createElement('link')
        link.type = 'text/css'
        link.src = url
        promises.push(
          new Promise((resolve, reject) => {
            link.onload = resolve
            link.onerror = reject
          }),
        )
        document.head.append(link)
        return
      }
      console.log('Unknown format for changed file', format)
    })
    await Promise.all(promises)
    console.log('[HMR] Loaded updated files - Applying changes now')
    applyHMR(oldModules, changedModules)

    return
  }
  console.error(`[HMR] Unknown response from server`, response)
}

async function main() {
  const response = await fetch(HMR_URL)
  const reader = response.body.getReader()

  async function read() {
    const { done, value } = await reader.read()
    const contents = new TextDecoder('utf-8').decode(value)
    let parsed
    try {
      parsed = JSON.parse(contents)
    } catch (error) {
      /* No Op */
    }
    if (parsed) {
      await handleResponse(parsed)
    }
    if (!done) {
      await read()
    }
  }

  read().catch(console.error)
}

main().catch(console.error)

sbPundle.moduleHooks.push(function(newModule) {
  const accepted = []
  const declined = []
  const errorHandlers = []
  const successHandlers = []
  const disposeHandlers = []

  function addDisposeHandler(callback) {
    const index = disposeHandlers.indexOf(callback)
    if (index !== -1) {
      throw new Error('Module dispose handler is already attached')
    } else {
      disposeHandlers.push(callback)
    }
  }
  function removeDisposeHandler(callback) {
    const index = disposeHandlers.indexOf(callback)
    if (index !== -1) {
      disposeHandlers.splice(index, 1)
    }
  }

  const hot = {
    data: {},
    accepted,
    declined,
    errorHandlers,
    successHandlers,
    disposeHandlers,
    status() {
      return 'check'
    },
    accept(arg1, arg2) {
      if (typeof arg1 === 'string' || Array.isArray(arg1)) {
        if (Array.isArray(arg1)) {
          accepted.push(...arg1)
        } else {
          accepted.push(arg1)
        }
        successHandlers.push(arg2)
      } else {
        if (typeof arg1 === 'function') {
          errorHandlers.push(arg1)
        }
        accepted.push('*')
      }
    },
    decline(dependencies) {
      if (Array.isArray(dependencies)) {
        declined.push(...dependencies)
      } else {
        declined.push(dependencies || '*')
      }
    },
    check() {},
    apply() {},
    dispose: addDisposeHandler,
    addDisposeHandler,
    removeDisposeHandler,
    addStatusHandler() {},
    removeStatusHandler() {},
  }
  newModule.hot = hot
})
