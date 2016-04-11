'use strict'

/* @flow */

import express from 'express'
import Pundle from 'pundle'
import middleware from 'pundle-middleware'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { Express$Server, Server$Config } from './types'

class Server {
  config: Server$Config;
  pundle: Pundle;
  server: ?Express$Server;
  subscriptions: CompositeDisposable;

  constructor(config: Server$Config) {
    this.config = config
    this.pundle = new Pundle(config.pundle)
    this.subscriptions = new CompositeDisposable()
  }
  listen(listeningCallback: ?Function): Disposable {
    const app = express()
    const server = app.listen(this.config.server.port, listeningCallback)
    const compilation = this.pundle.get()
    const disposable = new Disposable(() => {
      server.close()
      compilation.dispose()
      this.subscriptions.remove(disposable)
    })
    this.subscriptions.add(disposable)

    middleware({
      app,
      server,
      compilation,
      config: this.config
    })

    return disposable
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = Server
