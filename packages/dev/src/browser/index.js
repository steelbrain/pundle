'use strict'

let numUpdate = 1

function openHMRConnection() {
  const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${SB_PUNDLE_HMR_PATH}`)
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
    } else {
      console.log('[HMR] Unknown response', message)
    }
  })
  socket.addEventListener('close', function() {
    console.log('[HMR] Retrying in 5 seconds')
    setTimeout(openHMRConnection, 5000)
  })
}
openHMRConnection()
