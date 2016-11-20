/* @flow */

import { Disposable } from 'sb-event-kit'
import { MessageIssue, createSimple } from 'pundle-api'
import type { File } from 'pundle-api/types'
import * as Helpers from './helpers'

// NOTE: Middleware overwrites publicPath config in existing Pundle config
const browserFile = require.resolve('./browser')
export async function createMiddleware(pundle: Object, express: Object, givenConfig: Object = {}): Disposable {
  let ready = false
  let active = true
  let compiled: { contents: string, sourceMap: Object } = { contents: '', sourceMap: {} }
  const config = Helpers.fillConfig(givenConfig)
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

  const componentSubscription = await pundle.loadComponents([
    createSimple({
      activate() {
        pundle.compilation.config.entry.unshift(browserFile)
        pundle.config.publicPath = config.publicPath || oldPublicPath
        pundle.compilation.config.replaceVariables.SB_PUNDLE_HMR_PATH = JSON.stringify(config.hmrPath)
        express.get(config.bundlePath, function(req, res, next) {
          if (active) {
            watcherSubscription.queue.then(() => res.set('content-type', 'application/javascript').end(compiled.contents))
          } else next()
        })
        express.get(`${config.bundlePath}.map`, function(req, res, next) {
          if (active) {
            watcherSubscription.queue.then(() => res.json(compiled.sourceMap))
          } else next()
        })
        if (hmrEnabled) {
          express.get(config.hmrPath, function(req, res, next) {
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
      if (!ready) {
        return
      }
      if (!error) {
        filesChanged.add(filePath)
        return
      }
      // TODO: Push these errors to browser
    },
    ready() {
      ready = true
    },
    async compile(totalFiles: Array<File>) {
      compiled = await pundle.generate(totalFiles, {
        wrapper: 'hmr',
        sourceMap: true,
        sourceMapPath: config.sourceMapPath,
        sourceNamespace: 'app',
      })
      if (hmrEnabled && connections.size) {
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
    },
  })

  return new Disposable(function() {
    watcherSubscription.dispose()
    componentSubscription.dispose()
  })
}
