#!/usr/bin/env node
/* @flow */

import FS from 'fs'
import Path from 'path'
import chalk from 'chalk'
import command from 'sb-command'
import fileSize from 'filesize'
import { createServer } from 'pundle-dev'

import manifestPundle from 'pundle/package.json'
import manifestPundleDev from 'pundle-dev/package.json'
import manifestCLI from '../package.json'

import * as Helpers from './helpers'
require('process-bootstrap')('pundle', 'Pundle')

command
  .version(`Pundle v${manifestPundle.version} (CLI v${manifestCLI.version}) (Dev v${manifestPundleDev.version})`)
  .option('-r, --root-directory <directory>', 'Root path where Pundle config file exists', process.cwd())
  .option('-c, --config-file-name <name>', 'Name of Pundle config file (defaults to .pundle.js)', '.pundle.js')
  .option('-d, --dev', 'Enable dev http server', false)
  .option('-p, --port <port>', 'Port for dev server to listen on')
  .option('--server-root-directory <dir>', 'Directory to use as root for dev server')
  .command('init [type]', 'Copy default Pundle configuration into root directory (type can be full or basic, defaults to basic)', function(options, givenType) {
    const configType = givenType === 'full' ? 'full' : 'basic'
    console.log(`Initializing with ${configType} configuration`)
    Helpers.copyFiles(Path.normalize(Path.join(__dirname, '..', 'vendor')), options.rootDirectory, [
      [`config-${configType}.js`, options.configFileName],
    ])
  })
  .default(function(options, ...commands) {
    if (commands.length !== 0) {
      command.showHelp()
      process.exit(0)
    }
    try {
      FS.statSync(Path.join(options.rootDirectory, options.configFileName))
    } catch (_) {
      console.error('Cannot find Pundle configuration file')
      process.exit(1)
    }
    process.env.NODE_ENV = options.dev ? 'development' : 'production'
    // eslint-disable-next-line global-require
    const Pundle = require('pundle')

    Pundle.create({
      rootDirectory: options.rootDirectory,
      configFileName: options.configFileName,
    }).then(function(pundle) {
      let promise
      const config = Helpers.fillCLIConfig(pundle.config)

      if (options.dev) {
        const serverPort = options.port || config.server.port
        promise = createServer(pundle, {
          port: serverPort,
          hmrPath: config.server.hmrPath,
          hmrHost: config.server.hmrHost,
          hmrReports: config.server.hmrReports,
          sourceMap: config.server.sourceMap,
          sourceMapPath: config.server.sourceMapPath,
          bundlePath: config.server.bundlePath,
          rootDirectory: options.serverRootDirectory || Path.resolve(options.rootDirectory, config.server.rootDirectory),
          redirectNotFoundToIndex: config.server.redirectNotFoundToIndex,
        }).then(function() {
          console.log(`Server is running on ${chalk.blue(`http://localhost:${serverPort}/`)}`)
        })
      } else {
        promise = pundle.generate(null, {
          sourceMap: config.output.sourceMap,
          sourceMapPath: config.output.sourceMapPath,
        }).then(async function(generated) {
          const outputFilePath = Path.resolve(pundle.config.compilation.rootDirectory, config.output.bundlePath)
          const outputSourceMapPath = Path.resolve(pundle.config.compilation.rootDirectory, config.output.sourceMapPath)
          FS.writeFileSync(outputFilePath, generated.contents)
          console.log(`Wrote ${chalk.red(fileSize(generated.contents.length))} to '${chalk.blue(outputFilePath)}'`)
          if (config.output.sourceMap && config.output.sourceMapPath !== 'inline') {
            const sourceMap = JSON.stringify(generated.sourceMap)
            FS.writeFileSync(outputSourceMapPath, sourceMap)
            console.log(`Wrote ${chalk.red(fileSize(sourceMap.length))} to '${chalk.blue(outputSourceMapPath)}'`)
          }
        })
      }
      return promise.catch(function(error) {
        process.exitCode = 1
        pundle.compilation.report(error)
      })
    }).catch(function(error) {
      process.exitCode = 1
      console.log(error)
    })
  })
  .parse(process.argv)
