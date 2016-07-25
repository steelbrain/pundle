/* @flow */

import FS from 'fs'
import Path from 'path'
import debug from 'debug'
import promisify from 'sb-promisify'
import sourceMapToComment from 'source-map-to-comment'
import { CompositeDisposable } from 'sb-event-kit'
import Pundle from './'
import * as Helpers from './helpers'
import type { Config, WatcherConfig, GeneratorConfig } from './types'

const writeFile = promisify(FS.writeFile)
const debugInfo = debug('Pundle:Info')
const debugError = debug('Pundle:Error')
const debugWrite = debug('Pundle:Write')

type CLIConfig = {
  watch: boolean,
  outputFile: string,
  sourceMapInline: boolean,
  sourceMapOutputFile: string,
}

class PundleCLI {
  config: {
    cli: CLIConfig,
    pundle: Config,
    watcher: WatcherConfig,
    generator: GeneratorConfig,
  };
  pundle: Pundle;
  subscriptions: CompositeDisposable;

  constructor(config: { pundle: Object, watcher: Object, generator: Object, cli: CLIConfig }) {
    this.pundle = new Pundle(config.pundle)
    this.config = {
      cli: config.cli,
      pundle: config.pundle,
      watcher: config.watcher,
      generator: config.generator,
    }
    this.subscriptions = new CompositeDisposable()
  }
  async activate() {
    if (this.config.cli.watch) {
      this.watch()
    } else {
      await this.pundle.compile()
      await this.write(this.pundle.generate(this.config.generator))
    }
  }
  watch() {
    const watcherInfo = this.pundle.watch(Object.assign(this.config.watcher, {
      error(error) {
        debugError(error)
      },
      generate: () => {
        debugInfo('(Re)generating bundle')
        watcherInfo.queue = watcherInfo.queue.then(() => this.write(this.pundle.generate(this.config.generator))).catch(function(error) {
          debugError(error)
        })
      },
    }))
    this.subscriptions.add(watcherInfo.subscription)
  }
  async write(generated: Object) {
    let contents = generated.contents
    let writeSourceMap = false
    if (generated.sourceMap) {
      if (this.config.cli.sourceMapInline) {
        contents += `\n${sourceMapToComment(generated.sourceMap)}`
      } else if (this.config.cli.sourceMapOutputFile) {
        contents += `\n//# sourceMappingURL=${Path.relative(Path.dirname(this.config.cli.outputFile), this.config.cli.sourceMapOutputFile)}`
        writeSourceMap = true
      }
    }

    await writeFile(this.config.cli.outputFile, contents)
    debugWrite(this.config.cli.outputFile)
    if (writeSourceMap) {
      await writeFile(this.config.cli.sourceMapOutputFile, JSON.stringify(generated.sourceMap, null, 2))
      debugWrite(this.config.cli.sourceMapOutputFile)
    }
  }
  dispose() {
    this.subscriptions.dispose()
  }
}

module.exports = PundleCLI
