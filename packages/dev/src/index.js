/* @flow */

import ws from 'ws'
import Path from 'path'
import debug from 'debug'
import Pundle from 'pundle'
import express from 'express'
import sourceMapToComment from 'source-map-to-comment'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { Config, WatcherConfig, GeneratorConfig } from '../../pundle/src/types'
import type { ServerConfig } from './types'

const debugServer = debug('Pundle:Server')
const browserClient = require.resolve('../browser')

class Server {
  config: {
    server: ServerConfig,
    pundle: Config,
    watcher: WatcherConfig,
    generator: GeneratorConfig,
  };
  pundle: Pundle;
  server: express;
  subscriptions: CompositeDisposable;

  constructor(config: { server: ServerConfig, pundle: Object, watcher: Object, generator: Object }) {
    this.config = config
    if (this.config.server.hmr) {
      this.config.pundle.entry.unshift(browserClient)
    }
    this.config.pundle.replaceVariables = Object.assign({
      'PUNDLE.MAGIC.HMR_PATH': this.config.server.hmrPath,
    }, this.config.pundle.replaceVariables)

    this.pundle = new Pundle(config.pundle)
    this.server = express()
    this.subscriptions = new CompositeDisposable()
  }
  async activate() {
    // HMR Stuff
    let ready = false
    const wsConnections = new Set()
    const filesUpdated = new Set()

    const subscriptions = new CompositeDisposable()
    const watcherInfo = this.pundle.watch(Object.assign(this.config.watcher, {
      generate: () => {
        debugServer(`Sending HMR of ${filesUpdated.size} file(s) to ${wsConnections.size} connection(s)`)
        if (!filesUpdated.size || !wsConnections.size) {
          filesUpdated.clear()
          return
        }
        const generated = this.pundle.generate(Object.assign({}, this.config.generator, {
          wrapper: 'none',
          contents: Array.from(filesUpdated),
          requires: [],
          projectName: `hmr-${Date.now()}`,
        }))
        let contents = generated.contents
        if (generated.sourceMap) {
          contents += `\n${sourceMapToComment(generated.sourceMap)}`
        }
        const payload = JSON.stringify({
          type: 'update',
          contents,
          filesUpdated: Array.from(filesUpdated).map(i => this.pundle.getUniquePathID(i)),
        })
        for (const entry of wsConnections) {
          entry.send(payload)
        }
        filesUpdated.clear()
      },
      ready() {
        ready = true
      },
      error: this.config.server.error,
    }))
    const app = this.server
    app.get(this.config.server.bundlePath, (req, res) => {
      filesUpdated.clear()
      watcherInfo.queue = watcherInfo.queue.then(() => {
        const generated = this.pundle.generate(this.config.generator)
        let contents = generated.contents
        if (generated.sourceMap) {
          contents += `\n//# sourceMappingURL=${Path.relative(Path.dirname(this.config.server.bundlePath), this.config.server.sourceMapPath)}`
        }
        res.header('Content-Type', 'application/javascript')
        res.end(contents)
      }).catch(error => {
        res.sendStatus(500)
        res.end()
        this.config.server.error(error)
      })
    })

    // $FlowIgnore: Flow doesn't recognize the property
    if (this.config.generator.sourceMap) {
      app.get(this.config.server.sourceMapPath, (req, res) => {
        watcherInfo.queue = watcherInfo.queue.then(() => {
          const generated = this.pundle.generate(this.config.generator)
          res.header('Content-Type', 'application/json')
          res.end(JSON.stringify(generated.sourceMap, null, 2))
        }).catch(error => {
          res.sendStatus(500)
          res.end()
          this.config.server.error(error)
        })
      })
    }
    if (this.config.server.sourceRoot) {
      app.use(express.static(this.config.server.sourceRoot))
    }
    const server = app.listen(this.config.server.port, this.config.server.ready)
    if (this.config.server.hmr) {
      // $FlowIgnore: Flow doesn't want the custom prop
      this.config.generator.wrapper = 'hmr'
      const wsServer = new ws.Server({ server })
      wsServer.on('connection', connection => {
        if (connection.upgradeReq.url !== this.config.server.hmrPath) {
          connection.close()
          return
        }
        wsConnections.add(connection)
        connection.onclose = function() {
          wsConnections.delete(this)
        }
      })
      this.pundle.onDidProcess(function({ filePath }) {
        if (ready) {
          filesUpdated.add(filePath)
        }
      })
    }

    subscriptions.add(watcherInfo.subscription)
    subscriptions.add(new Disposable(() => {
      this.subscriptions.remove(subscriptions)
      server.close()
    }))
    this.subscriptions.add(subscriptions)
    return subscriptions
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Server
