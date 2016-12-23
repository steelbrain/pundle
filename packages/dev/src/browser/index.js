'use strict'

let numUpdate = 1

function getHMRUrl() {
  // NOTE: SB_PUNDLE_HMR_HOST format is "protocol://hostname"
  // For example, "http://google.com" or "https://reddit.com"
  const host = SB_PUNDLE_HMR_HOST || location.origin
  const path = SB_PUNDLE_HMR_PATH
  let scheme
  if (host.slice(0, 8) === 'https://') {
    scheme = 'wss'
  } else if (host.slice(0, 7) === 'http://') {
    scheme = 'ws'
  } else throw new Error('Invalid HMR host specified in Pundle configuration')
  return `${scheme}://${host.slice(host.indexOf('//') + 2)}${path}`
}
function openHMRConnection() {
  const socket = new WebSocket(getHMRUrl())
  const interval = setInterval(function() {
    if (socket.readyState === 1) {
      // NOTE: This is to keep the connection alive
      socket.send('ping')
    }
  }, 2000)
  socket.addEventListener('open', function() {
    console.log('[HMR] Connected')
  })
  socket.addEventListener('close', function() {
    console.log('[HMR] Disconnected')
  })
  socket.addEventListener('message', function(event) {
    const message = JSON.parse(event.data)
    if (message.type === 'hmr') {
      eval(`${message.contents}\n//@ sourceURL=${location.origin}/__pundle__/hmr-${numUpdate++}`)
      console.log('[HMR] Files Changed:', message.files.join(', '))
      __sbPundle.hmrApply(message.files)
    } else if (message.type === 'report') {
      const container = document.createElement('div')
      container.innerHTML = __sbPundle.ansiToHtml(message.text)
      document.body.insertBefore(container, document.body.firstChild)
      setTimeout(function() {
        container.remove()
      }, 5000)
    } else {
      console.log('[HMR] Unknown response', message)
    }
  })
  socket.addEventListener('close', function() {
    clearInterval(interval)
    console.log('[HMR] Retrying in 2 seconds')
    setTimeout(openHMRConnection, 2000)
  })
}
openHMRConnection()
