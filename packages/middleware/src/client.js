'use strict'

const socket = new WebSocket(`ws://${location.host}/__pundle__/hmr`)
socket.addEventListener('open', function() {
  console.log('[HMR] Connected')
})
socket.addEventListener('close', function() {
  console.log('[HMR] Disconnected')
})
socket.addEventListener('message', function(event) {
  console.log(event.data)
  const message = JSON.parse(event.data)
  if (message.type === 'update') {
    const module = require.cache[message.filePath]
    console.log(message, require, module)
  }
})
