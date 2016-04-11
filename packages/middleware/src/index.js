'use strict'

/* @flow */

import Path from 'path'
import send from 'send'
import ws from 'ws'
import type { WatcherConfig } from '../../pundle/src/types'
import type Compilation from '../../pundle/src/compilation'
import type { Middleware$Options } from './types'

type Options = {
  app: Object,
  server: Object,
  compilation: Compilation,
  config: { middleware: Middleware$Options, watcher: WatcherConfig }
}

function attach({ app, server, compilation, config }: Options) {
  const status = compilation.watch(config.watcher)
  const middlewareConfig = Object.assign({
    sourceMap: true,
    publicPath: '/',
    publicBundlePath: '/bundle.js'
  }, config.middleware)

  // Convert it to abs path
  middlewareConfig.publicBundlePath = Path.join(compilation.config.rootDirectory,
    middlewareConfig.publicBundlePath)

  async function handleRequest(req, res, next) {
    if (req.method !== 'GET' || req.url.indexOf(middlewareConfig.publicPath) !== 0) {
      next()
      return
    }
    const absolutePath = Path.join(compilation.config.rootDirectory, req.url)
    if (absolutePath !== middlewareConfig.publicBundlePath) {
      send(req, req.url, { root: compilation.config.rootDirectory, index: 'index.html' })
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
        config.watcher.onError(error)
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
    if (middlewareConfig.sourceMap) {
      generated += compilation.generateSourceMap(null, true)
    }
    res.send(generated)
  }

  app.use(function(req, res, next) {
    handleRequest(req, res, next).catch(function(error) {
      config.watcher.onError(error)
      next()
    })
  })

  if (compilation.config.hmr) {
    const wsServer = new ws.Server({ server })
    const clients = new Set()
    compilation.config.entry.unshift(require.resolve('./client.js'))

    compilation.subscriptions.add({
      dispose() {
        wsServer.close()
      }
    })
    wsServer.on('connection', function(socket) {
      const request = socket.upgradeReq
      if (request.url !== '/__pundle__/hmr') {
        socket.close()
        return
      }
      clients.add(socket)
      socket.on('close', function() {
        clients.delete(socket)
      })
    })
    compilation.onDidCompile(function({ filePath, importsDifference }) {
      const modules = compilation.generator.gatherImports([filePath].concat(importsDifference.added))
      const contents = compilation.generator.generateAdvanced({
        prepend: '',
        append: ''
      }, modules)
      const update = JSON.stringify({ type: 'update', filePath, contents })
      for (const client of clients) {
        client.send(update)
      }
    })
  }
}

module.exports = attach
