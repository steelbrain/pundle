/* @flow */

import express from 'express'
import Pundle from 'pundle'
import middleware from 'pundle-middleware'
import { CompositeDisposable, Disposable } from 'sb-event-kit'
import type { Server$Config } from './types'

class Server {
  config: Server$Config;
  pundle: Pundle;
  server: Object;
  listening: boolean;
  subscriptions: CompositeDisposable;

  constructor(config: Server$Config) {
    this.config = config
    this.server = express()
    this.pundle = new Pundle(config.pundle)
    this.listening = false
    this.subscriptions = new CompositeDisposable()
  }
  listen(listeningCallback: ?Function): Disposable {
    if (this.listening) {
      throw new Error('Already listening')
    }
    this.listening = true

    const server = this.server.listen(this.config.server.port, listeningCallback)
    const compilation = this.pundle.get()
    const disposable = new Disposable(() => {
      server.close()
      compilation.dispose()
      this.subscriptions.remove(disposable)
    })
    this.subscriptions.add(disposable)

    middleware({
      app: this.server,
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
