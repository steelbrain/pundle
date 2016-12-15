/* @flow */

import send from 'send'
import debug from 'debug'
import express from 'express'
import { Server } from 'ws'
import { Disposable } from 'sb-event-kit'
import { MessageIssue, createSimple } from 'pundle-api'
import type { File } from 'pundle-api/types'
import * as Helpers from './helpers'

const debugTick = debug('PUNDLE:DEV:TICK')

const browserFile = require.resolve('./browser')
// NOTE: HMR server will not be created unless server is provided
export async function attachMiddleware(pundle: Object, givenConfig: Object = {}, expressApp: Object, server: Object): Disposable {
  if (pundle.compilation.config.entry.indexOf(browserFile) !== -1) {
    throw new Error('Cannot create two middlewares on one Pundle instance')
  }

  let active = true
  let compiled: { contents: string, sourceMap: Object } = { contents: '', sourceMap: {} }
  let firstCompile = true
  const config = Helpers.fillMiddlewareConfig(givenConfig)
  const hmrEnabled = config.hmrPath !== null
  const sourceMapEnabled = config.sourceMap && config.sourceMapPath !== 'none' && config.sourceMapPath !== 'inline'
  const connections = new Set()
  const filesChanged = new Set()
  const oldReplacementVar = pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH

  const writeToConnections = (contents) => {
    connections.forEach((connection) => connection.send(JSON.stringify(contents)))
  }
  let watcherSubscription
  // The watcherInfo implementation below is useful because
  // the watcher further below takes time to boot up, and we have to start
  // server instantly. With the help of this, we can immediately start server
  // while also waiting on the watcher
  const watcherInfo = {
    get queue() {
      if (!watcherSubscription || firstCompile) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(watcherInfo.queue)
          }, 100)
        })
      }
      return watcherSubscription.queue
    },
  }

  expressApp.get(config.bundlePath, function(req, res, next) {
    if (active) {
      watcherInfo.queue.then(() => res.set('content-type', 'application/javascript').end(compiled.contents))
    } else next()
  })
  if (sourceMapEnabled) {
    expressApp.get(config.sourceMapPath, function(req, res, next) {
      if (active) {
        watcherInfo.queue.then(() => res.json(compiled.sourceMap))
      } else next()
    })
  }

  let wss
  if (hmrEnabled) {
    wss = new Server({ server, path: config.hmrPath })
    wss.on('connection', function(connection) {
      if (active) {
        connection.on('close', () => connections.delete(connection))
        connections.add(connection)
      }
    })
  }

  const componentSubscription = await pundle.loadComponents([
    createSimple({
      activate() {
        pundle.compilation.config.entry.unshift(browserFile)
        pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH = JSON.stringify(config.hmrPath)
      },
      dispose() {
        active = false
        const entryIndex = pundle.compilation.config.entry.indexOf(browserFile)
        if (entryIndex !== -1) {
          pundle.compilation.config.entry.splice(entryIndex, 1)
        }
        pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH = oldReplacementVar
      },
    }, config),
  ])

  watcherSubscription = await pundle.watch({
    tick(filePath: string, error: ?Error) {
      debugTick(`${filePath} :: ${error ? error.message : 'null'}`)
      if (!error && filePath !== browserFile) {
        filesChanged.add(filePath)
        return
      }
      // TODO: Push these errors to browser
    },
    async compile(totalFiles: Array<File>) {
      if (hmrEnabled && !firstCompile) {
        if (connections.size) {
          pundle.compilation.report(new MessageIssue(`Sending HMR to ${connections.size} clients`, 'info'))
          const changedFilePaths = Array.from(filesChanged)
          const generated = await pundle.generate(totalFiles.filter(i => changedFilePaths.indexOf(i.filePath) !== -1), {
            entry: [],
            wrapper: 'none',
            sourceMap: config.sourceMap,
            sourceMapPath: 'inline',
            sourceNamespace: 'app',
            sourceMapNamespace: `hmr-${Math.random().toString(36).slice(-6)}`,
          })
          writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filePaths })
          filesChanged.clear()
        }
      }
      firstCompile = false
      compiled = await pundle.generate(totalFiles, {
        wrapper: 'hmr',
        sourceMap: config.sourceMap,
        sourceMapPath: config.sourceMapPath,
        sourceNamespace: 'app',
      })
    },
  })

  return new Disposable(function() {
    if (wss) {
      wss.close()
    }
    watcherSubscription.dispose()
    componentSubscription.dispose()
  })
}

// NOTE: Make SURE to setup the static handler AFTER middleware is invoked and
//       that the middleware doesn't await before registering the route
// NOTE: Also accepts all of middleware options
// NOTE: The return value has a `server` and `app` property that references express instance and server instance
export async function createServer(pundle: Object, givenConfig: Object): Promise<Disposable> {
  const app = express()
  const config = Helpers.fillServerConfig(givenConfig)

  const server = app.listen(config.port)
  const middlewarePromise = attachMiddleware(pundle, givenConfig, app, server)
  app.use('/', express.static(config.directory))
  if (config.redirectNotFoundToIndex) {
    app.use(function httpError(req, res, next) {
      if (req.url !== '/index.html' && req.baseUrl !== '/index.html') {
        req.baseUrl = req.url = '/index.html'
        send(req, req.baseUrl, { root: config.directory, index: 'index.html' })
          .on('error', next)
          .on('directory', next)
          .pipe(res)
      } else next()
    })
  }
  const subscription = await middlewarePromise
  const disposable = new Disposable(function() {
    server.close()
    subscription.dispose()
  })

  disposable.app = app
  disposable.server = server
  return disposable
}
