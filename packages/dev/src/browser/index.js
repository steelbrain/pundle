'use strict'

let overlay
let numUpdate = 1
let hadNetworkError = false
const overlayStyle = {
  position: 'fixed',
  boxSizing: 'border-box',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  zIndex: Number.MAX_VALUE,
  backgroundColor: 'black',
  color: '#E8E8E8',
  fontFamily: 'Menlo, Consolas, monospace',
  fontSize: 'large',
  padding: '2rem',
  lineHeight: '1.2',
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
}
// ^ Shamelessly copied from create-react-app ( https://github.com/facebookincubator/create-react-app/blob/master/packages/react-dev-utils/webpackHotDevClient.js#L59 )

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
  let connectedOnce = false
  const socket = new WebSocket(getHMRUrl())
  const interval = setInterval(function() {
    if (socket.readyState === 1) {
      // NOTE: This is to keep the connection alive
      socket.send('ping')
    }
  }, 2000)
  let retryTime = 2000
  socket.addEventListener('open', function() {
    connectedOnce = true
    hadNetworkError = false
    console.log('[HMR] Connected')
  })
  socket.addEventListener('close', function() {
    clearInterval(interval)
    if (connectedOnce) {
      console.log('[HMR] Disconnected')
      console.log('[HMR] Retrying in ${retryTime / 1000} seconds')
      setTimeout(openHMRConnection, retryTime)
      if (retryTime < 16000) {
        retryTime += 2000
      }
    }
  })
  socket.addEventListener('message', function(event) {
    const message = JSON.parse(event.data)
    if (message.type === 'hmr') {
      eval(`${message.contents}\n//@ sourceURL=${location.origin}/__pundle__/hmr-${numUpdate++}`)
      console.log('[HMR] Files Changed:', message.files.join(', '))
      __sbPundle.hmrApply(message.files)
    } else if (message.type === 'report') {
      if (overlay) {
        overlay.remove()
      }
      overlay = document.createElement('div')
      overlay.innerHTML = __sbPundle.ansiToHtml(message.text)
      Object.assign(overlay.style, overlayStyle)
      document.body.appendChild(overlay)
      setTimeout(function() {
        overlay.remove()
      }, 60000)
    } else if (message.type === 'report-clear') {
      if (overlay) {
        overlay.remove()
      }
    } else {
      console.log('[HMR] Unknown response', message)
    }
  })
}
openHMRConnection()
