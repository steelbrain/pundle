#!/usr/bin/env node
/* @flow */

import FS from 'fs'
import Path from 'path'
import chalk from 'chalk'
import Pundle from 'pundle'
import program from 'commander'
import fileSize from 'filesize'
import { createServer } from 'pundle-dev'

import manifestPundle from 'pundle/package.json'
import manifestPundleDev from 'pundle-dev/package.json'
import manifestCLI from '../package.json'

import * as Helpers from './helpers'
require('process-bootstrap')('pundle', 'Pundle')

program
  .version(`Pundle v${manifestPundle.version} (CLI v${manifestCLI.version}) (Dev v${manifestPundleDev.version})`)
  .option('-r, --root-directory <directory>', 'Root path where Pundle config file exists', process.cwd())
  .option('-c, --config-file-name <name>', 'Name of Pundle config file (defaults to .pundle.js)', '.pundle.js')
  .option('-d, --dev', 'Enable dev http server', false)
  .option('-p, --port [port]', 'Port for dev server to listen on')
  .option('--dev-directory <dir>', 'Directory to use as root for dev server', process.cwd())
  .parse(process.argv)

try {
  FS.statSync(Path.join(program.rootDirectory, program.configFileName))
} catch (_) {
  console.error('Cannot find Pundle configuration file')
  process.exit(1)
}

Pundle.create({
  rootDirectory: program.rootDirectory,
  configFileName: program.configFileName,
}).then(function(pundle) {
  const config = Helpers.fillCLIConfig(pundle.config)
  process.env.NODE_ENV = program.dev ? 'development' : 'production'
  if (program.dev) {
    return createServer(pundle, {
      port: program.port || config.server.port,
      directory: program.devDirectory,
      hmrPath: config.server.hmrPath,
      bundlePath: config.server.bundlePath,
      sourceMap: config.server.sourceMap,
      sourceMapPath: config.server.sourceMapPath,
      redirectNotFoundToIndex: config.server.redirectNotFoundToIndex,
    })
  }
  return pundle.generate(null, {
    sourceMapPath: config.output.sourceMapPath,
  }).then(async function(generated) {
    const outputFilePath = Path.join(pundle.config.compilation.rootDirectory, config.output.bundlePath)
    const outputSourceMapPath = Path.join(pundle.config.compilation.rootDirectory, config.output.sourceMapPath)
    FS.writeFileSync(outputFilePath, generated.contents)
    console.log(`Wrote ${chalk.red(fileSize(generated.contents.length))} to '${chalk.blue(outputFilePath)}'`)
    if (config.sourceMap && config.output.sourceMapPath !== 'inline') {
      const sourceMap = JSON.stringify(generated.sourceMap)
      FS.writeFileSync(outputSourceMapPath, sourceMap)
      console.log(`Wrote ${chalk.red(fileSize(sourceMap.length))} to '${chalk.blue(outputSourceMapPath)}'`)
    }
  })
}).catch(function(error) {
  console.log('Error', error.message)
})
