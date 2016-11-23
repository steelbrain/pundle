/* @flow */

import express from 'express'
import { Disposable } from 'sb-event-kit'
import { MessageIssue, createSimple } from 'pundle-api'
import type { File } from 'pundle-api/types'
import * as Helpers from './helpers'

// NOTE: MiddlewareConfig overwrites publicPath config in existing Pundle config
const browserFile = require.resolve('./browser')
export async function attachMiddleware(pundle: Object, expressApp: Object, givenConfig: Object = {}): Disposable {
  if (pundle.compilation.config.entry.indexOf(browserFile) !== -1) {
    throw new Error('Cannot create two middlewares on one Pundle instance')
  }

  let active = true
  let compiled: { contents: string, sourceMap: Object } = { contents: '', sourceMap: {} }
  let firstCompile = true
  const config = Helpers.fillMiddlewareConfig(givenConfig)
  const hmrEnabled = config.hmrPath !== null
  const connections = new Set()
  const filesChanged = new Set()
  const oldPublicPath = pundle.config.publicPath
  const oldReplacementVar = pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH

  const writeToConnections = (contents) => {
    connections.forEach((connection) => connection.json(contents))
    connections.clear()
  }
  let watcherSubscription
  // The watcherInfo implementation below is useful because
  // the watcher below takes time to boot up, and we have to start server
  // instantly. With the help of this, we can immediately start server
  // while also waiting on the watcher
  const watcherInfo = {
    get queue() {
      if (watcherSubscription) {
        return watcherSubscription.queue
      }
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(watcherInfo.queue)
        }, 100)
      })
    },
  }

  const componentSubscription = await pundle.loadComponents([
    createSimple({
      activate() {
        pundle.compilation.config.entry.unshift(browserFile)
        pundle.config.publicPath = config.publicPath || oldPublicPath
        pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH = JSON.stringify(config.hmrPath)
        expressApp.get(config.bundlePath, function(req, res, next) {
          if (active) {
            watcherInfo.queue.then(() => res.set('content-type', 'application/javascript').end(compiled.contents))
          } else next()
        })
        expressApp.get(`${config.bundlePath}.map`, function(req, res, next) {
          if (active) {
            watcherInfo.queue.then(() => res.json(compiled.sourceMap))
          } else next()
        })
        if (hmrEnabled) {
          expressApp.get(config.hmrPath, function(req, res, next) {
            if (active) {
              req.on('close', () => connections.delete(res))
              connections.add(res)
            } else next()
          })
        }
      },
      dispose() {
        active = false
        const entryIndex = pundle.compilation.config.entry.indexOf(browserFile)
        if (entryIndex !== -1) {
          pundle.compilation.config.entry.splice(entryIndex, 1)
        }
        pundle.config.publicPath = oldPublicPath
        pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH = oldReplacementVar
      },
    }, config),
  ])

  watcherSubscription = await pundle.watch({
    tick(filePath: string, error: ?null) {
      if (!error && filePath !== browserFile) {
        filesChanged.add(filePath)
        return
      }
      // TODO: Push these errors to browser
    },
    async compile(totalFiles: Array<File>) {
      compiled = await pundle.generate(totalFiles, {
        wrapper: 'hmr',
        sourceMap: true,
        sourceMapPath: config.sourceMapPath,
        sourceNamespace: 'app',
      })
      if (hmrEnabled && !firstCompile) {
        pundle.compilation.report(new MessageIssue(`Sending HMR to ${connections.size} clients`, 'info'))
        const changedFilePaths = Array.from(filesChanged)
        const generated = await pundle.generate(totalFiles.filter(i => changedFilePaths.indexOf(i.filePath) !== -1), {
          entry: [],
          wrapper: 'none',
          sourceMap: true,
          sourceMapPath: 'inline',
          sourceNamespace: 'app',
          sourceMapNamespace: `hmr-${Math.random().toString(36).slice(-6)}`,
          printResolutionMappings: false,
        })
        writeToConnections({ type: 'hmr', contents: generated.contents, files: generated.filePaths })
        filesChanged.clear()
      }
      firstCompile = false
    },
  })

  return new Disposable(function() {
    watcherSubscription.dispose()
    componentSubscription.dispose()
  })
}

// NOTE: Also accepts all of middleware options
// NOTE: The return value has a `server` and `app` property that references express instance and server instance
export async function createServer(pundle: Object, givenConfig: Object): Promise<Disposable> {
  const app = express()
  const config = Helpers.fillServerConfig(givenConfig)

  const server = app.listen(config.port)
  app.use('/', express.static(config.directory))
  const subscription = await attachMiddleware(pundle, app, givenConfig)
  const disposable = new Disposable(function() {
    server.close()
    subscription.dispose()
  })

  disposable.app = app
  disposable.server = server
  return disposable
}
