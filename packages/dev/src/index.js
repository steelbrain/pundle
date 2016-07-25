/* @flow */

import Path from 'path'
import Pundle from 'pundle'
import express from 'express'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { Config, WatcherConfig, GeneratorConfig } from '../../pundle/src/types'
import type { ServerConfig } from './types'

class Server {
  config: {
    server: ServerConfig,
    pundle: Config,
    watcher: WatcherConfig,
    generator: GeneratorConfig,
  };
  pundle: Pundle;
  subscriptions: CompositeDisposable;

  constructor(config: { server: ServerConfig, pundle: Object, watcher: Object, generator: Object }) {
    this.config = config
    this.pundle = new Pundle(config.pundle)
    this.subscriptions = new CompositeDisposable()
  }
  async activate() {
    let ready = false
    const subscriptions = new CompositeDisposable()
    const watcherInfo = this.pundle.watch(Object.assign(this.config.watcher, {
      generate() {
        console.log('should send hmr to connected peeps')
      },
      ready() {
        ready = true
      },
      error: this.config.server.error,
    }))
    const app = express()
    app.get(this.config.server.bundlePath, (req, res) => {
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

    // $FlowIgnore: Stupid flow doesn't recognize the property
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
    app.listen(this.config.server.port, this.config.server.ready)
    console.log('ready', ready)

    subscriptions.add(watcherInfo.subscription)
    subscriptions.add(new Disposable(() => {
      this.subscriptions.remove(subscriptions)
    }))
    this.subscriptions.add(subscriptions)
    return subscriptions
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Server
