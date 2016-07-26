'use strict'

function openHMRConnection() {
  const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${PUNDLE.MAGIC.HMR_PATH}`)
  socket.addEventListener('open', function() {
    console.log('[HMR] Connected')
  })
  socket.addEventListener('close', function() {
    console.log('[HMR] Disconnected')
  })
  socket.addEventListener('message', function(event) {
    const message = JSON.parse(event.data)
    console.log('[HMR] message', message)
    if (message.type === 'update') {
      console.log('[HMR] Applying', message.filesUpdated.join(', '))
      eval(message.contents)
      __sb_pundle_apply_hmr(message.filesUpdated, new Set())
    }
  })
  socket.addEventListener('close', function() {
    console.log('[HMR] Retrying in 3 seconds')
    setTimeout(openHMRConnection, 3000)
  })
}
openHMRConnection()
