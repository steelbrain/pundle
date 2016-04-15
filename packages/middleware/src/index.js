'use strict'

/* @flow */

import invariant from 'assert'
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
  let ready = true
  const status = compilation.watch(config.watcher)
  const middlewareConfig = Object.assign({
    sourceMap: true,
    sourceRoot: compilation.config.rootDirectory,
    publicPath: '/',
    publicBundlePath: '/bundle.js'
  }, config.middleware)

  async function prepareRequest(res): Promise<boolean> {
    ready = false
    await status.queue
    const shouldGenerate = compilation.shouldGenerate()
    if (shouldGenerate) {
      let caughtError = false
      await Promise.resolve().then(function() {
        return compilation.compile()
      }).catch(function(error) {
        caughtError = true
        config.watcher.onError(error)
      })
      if (caughtError) {
        res.statusCode = 500
        res.send('Error during compilation, check your console for more info')
        ready = true
        return false
      }
    }
    ready = true
    return true
  }

  async function handleRequest(req, res, next) {
    if (req.method !== 'GET' || req.url.indexOf(middlewareConfig.publicPath) !== 0) {
      next()
      return
    }

    if (req.url === middlewareConfig.publicBundlePath) {
      if (!await prepareRequest(res)) {
        return
      }
      res.setHeader('Content-Type', 'application/javascript')
      let generated = compilation.generate()
      if (middlewareConfig.sourceMap) {
        generated += `//# sourceMappingURL=${middlewareConfig.publicBundlePath + '.map'}`
      }
      res.send(generated)
      return
    }
    if (req.url === middlewareConfig.publicBundlePath + '.map') {
      if (!await prepareRequest(res)) {
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.send(compilation.generateSourceMap())
      return
    }
    send(req, req.url, { root: middlewareConfig.sourceRoot, index: 'index.html' })
      .on('error', function() {
        next()
      })
      .on('directory', function() {
        res.statusCode = 301
        res.setHeader('Location', `${req.url}/`)
        res.send(`Redirecting to ${req.url}/`)
      })
      .pipe(res)
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
      if (!ready) {
        return
      }

      const module = compilation.modules.registry.get(filePath)
      invariant(module)
      const modules = compilation.generator.gatherImports(importsDifference.added)
      modules.push(module)
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
