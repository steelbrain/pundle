/* @flow */

import FS from 'fs'
import Path from 'path'
import promisify from 'sb-promisify'
import sourceMapToComment from 'source-map-to-comment'
import Pundle from './'
import * as Helpers from './helpers'
import type { Config, WatcherConfig, GeneratorConfig } from './types'

const writeFile = promisify(FS.writeFile)

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

  constructor(config: { pundle: Object, watcher: Object, generator: Object, cli: CLIConfig }) {
    this.config = {
      cli: config.cli,
      pundle: Helpers.fillConfig(config.pundle),
      watcher: config.watcher,
      generator: Helpers.fillGeneratorConfig(config.generator),
    }
    this.pundle = new Pundle(this.config.pundle)
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
    console.log('watching')
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
    if (writeSourceMap) {
      await writeFile(this.config.cli.sourceMapOutputFile, JSON.stringify(generated.sourceMap, null, 2))
    }
  }
}

module.exports = PundleCLI
