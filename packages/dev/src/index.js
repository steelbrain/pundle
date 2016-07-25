/* @flow */

import Pundle from 'pundle'
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
    const subscriptions = new CompositeDisposable()
    const watcherInfo = this.pundle.watch(Object.assign(this.config.watcher, {
      generate() {
        console.log('should send hmr to connected peeps')
      },
      ready() {
        console.log('ready')
      },
      error: this.config.server.error,
    }))

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
