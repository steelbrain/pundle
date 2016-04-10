'use strict'

/* @flow */

import Path from 'path'
import send from 'send'
import type { WatcherConfig } from '../../pundle/src/types'
import type Compilation from '../../pundle/src/compilation'
import type { Middleware$Options } from './types'

function attach(
  compilation: Compilation,
  watcherOptions: WatcherConfig,
  givenMiddlewareOptions: Middleware$Options
): Function {
  const status = compilation.watch(watcherOptions)
  const middlewareOptions = Object.assign({
    hmr: true,
    sourceMap: true,
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
    const shouldGenerate = compilation.shouldGenerate()
    if (shouldGenerate) {
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
    let generated = compilation.generate()
    if (middlewareOptions.sourceMap) {
      generated += compilation.generateSourceMap(null, true)
    }
    res.send(generated)
  }
}

module.exports = attach
