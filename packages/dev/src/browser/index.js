'use strict'

function requestForUpdates() {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', SB_PUNDLE_HMR_PATH, true)
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 400) {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null)
      } else {
        reject(new Error(`HTTP Error: Status code ${xhr.status}`))
      }
    }
    xhr.send()
    setTimeout(function() {
      resolve(null)
      xhr.abort()
    }, 5000)
  })
}

function keepRequestingForUpdates() {
  requestForUpdates().then(function(update) {
    if (!update) {
      return
    }
    if (update.type === 'hmr') {
      eval(update.contents)
      console.log('[HMR] Files Changed:', update.files.join(', '))
      __sbPundle.applyHMR(update.files)
    } else {
      console.log('[HMR] Unknown response', update)
    }
  }).catch(function(error) {
    console.log('[HMR] Error', error)
  }).then(keepRequestingForUpdates)
}

keepRequestingForUpdates()
