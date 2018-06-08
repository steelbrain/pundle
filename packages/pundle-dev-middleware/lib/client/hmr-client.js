const HMR_URL = `${document.currentScript.src}.pundle.hmr`

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
    console.log(paths, changedFiles, changedModules, oldModules)

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
        disposeHandlers.push(arg2)
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
