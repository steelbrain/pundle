'use strict'

/* @flow */

import Path from 'path'
import send from 'send'
import type { Pundle$Watcher$Options$User } from '../../pundle/src/types'
import type Compilation from '../../pundle/src/compilation'
import type { Middleware$Options } from './types'

function attach(
  compilation: Compilation,
  watcherOptions: Pundle$Watcher$Options$User,
  givenMiddlewareOptions: Middleware$Options
): Function {
  const status = compilation.watch(watcherOptions)
  const middlewareOptions = Object.assign({
    publicPath: '/',
    publicBundlePath: '/bundle.js'
  }, givenMiddlewareOptions)

  // Convert it to abs path
  middlewareOptions.publicBundlePath = Path.join(compilation.pundle.config.rootDirectory,
    middlewareOptions.publicBundlePath)

  return async function(req, res, next) {
    if (req.method !== 'GET' || req.url.indexOf(middlewareOptions.publicPath) !== 0) {
      next()
      return
    }
    const absolutePath = Path.join(compilation.pundle.config.rootDirectory, req.url)
    if (absolutePath !== middlewareOptions.publicBundlePath) {
      send(req, req.url, { root: compilation.pundle.config.rootDirectory, index: 'index.html' })
        .on('error', function() {
          next()
        })
        .on('directory', function() {
          res.statusCode = 301
          res.setHeader('Location', `${req.url}/`)
          res.send(`Redirecting to ${req.url}/`)
        })
        .pipe(res)
      return
    }
    const needsGeneration = compilation.needsGeneration()
    if (needsGeneration) {
      let caughtError = false
      status.queue = status.queue.then(function() {
        return compilation.compile()
      }).catch(function(error) {
        caughtError = true
        watcherOptions.onError(error)
      })
      await status.queue
      if (caughtError) {
        res.statusCode = 500
        res.send('Error during compilation, check your console for more info')
        return
      }
    }
    res.setHeader('Content-Type', 'application/javascript')
    res.send(compilation.generate())
  }
}

module.exports = attach
