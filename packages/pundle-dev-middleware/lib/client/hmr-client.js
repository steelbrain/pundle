const HMR_URL = `${document.currentScript.src}.pundle.hmr`

async function handleResponse(response) {
  console.log('response', response)
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
  console.log('newModule', newModule)
})
