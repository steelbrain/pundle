'use strict'

/* eslint-disable no-undef */

const socket = new WebSocket(`ws://${location.host}/__pundle__/hmr`)
socket.addEventListener('open', function() {
  console.log('[HMR] Connected')
})
socket.addEventListener('close', function() {
  console.log('[HMR] Disconnected')
})
socket.addEventListener('message', function(event) {
  const message = JSON.parse(event.data)
  if (message.type === 'update') {
    console.log('[HMR] Applying', message.filePath)
    eval(message.contents)
    __sb_pundle_apply_hmr(message.filePath, new Set())
  }
})
