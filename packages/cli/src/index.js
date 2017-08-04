#!/usr/bin/env node
/* @flow */

import FS from 'sb-fs'
import Path from 'path'
import copy from 'sb-copy'
import chalk from 'chalk'
import command from 'sb-command'
import PundleDevServer from 'pundle-dev'
import { CompositeDisposable } from 'sb-event-kit'

import createPundleApp from './createPundleApp'
import manifestPundle from 'pundle/package.json'
import manifestPundleDev from 'pundle-dev/package.json'
import manifestCLI from '../package.json'

import * as Helpers from './helpers'

const subscriptions = new CompositeDisposable()
let pundleIsAlive = true
function killPundle() {
  if (pundleIsAlive) {
    pundleIsAlive = false
    subscriptions.dispose()
  }
  process.exit()
}

process.title = 'pundle'
process.on('unhandledRejection', function (reason) {
  console.log('unhandledRejection', reason)
})
process.on('uncaughtException', function(error) {
  console.log(`Uncaught exception: ${error}`)
})
process.on('SIGINT', killPundle)
process.on('exit', killPundle)

command
  .version(`Pundle v${manifestPundle.version} (CLI v${manifestCLI.version}) (Dev v${manifestPundleDev.version})`)
  .option('-r, --root-directory <directory>', 'Root path where Pundle config file exists', process.cwd())
  .option('-c, --config-file-name <name>', 'Name of Pundle config file (defaults to .pundle.js)', '.pundle.js')
  .option('-d, --dev', 'Enable dev http server', false)
  .option('-p, --port <port>', 'Port for dev server to listen on')
  .option('--server-root-directory <dir>', 'Directory to use as root for dev server')
  .option('--disable-cache', 'Disable use of dev server cache', false)
  .option('--debug', 'Enable stack traces of errors, useful for debugging', false)
  .command('init [type]', 'Initialize current directory', function pundleInit(options, givenType) {
    createPundleApp(options.rootDirectory, options, givenType)
  })
  .command('new <name> [type]', 'Copy default Pundle configuration into new directory (type can be full or basic, defaults to basic)', async function(options, name, givenType) {
    const rootDirectory = Path.join(options.rootDirectory, name)
    if (await FS.exists(rootDirectory)) {
      throw new Error(`Target directory '${name}' already exists`)
    }
    await Helpers.mkdirp(rootDirectory)
    await createPundleApp(rootDirectory, options, givenType)
  })
  .command('build [outputDirectory]', 'Build your app to outputDirectory', async function(options, outDir) {
    const pundle = await Helpers.getPundle(options)
    const config = Helpers.fillCLIConfig(pundle.config)
    Helpers.build(pundle, options, config)
  })
  .default(async function(options, ...commands) {
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

    try {
      const pundle = await Helpers.getPundle(options)
      let promise
      const config = Helpers.fillCLIConfig(pundle.config)

      subscriptions.add(pundle)
      if (options.dev) {
        const serverPort = options.port || config.server.port
        const devServer = new PundleDevServer(pundle, {
          port: serverPort,
          hmrPath: config.server.hmrPath,
          hmrHost: config.server.hmrHost,
          useCache: !options.disableCache,
          hmrReports: config.server.hmrReports,
          sourceMap: config.server.sourceMap,
          sourceMapPath: config.server.sourceMapPath,
          bundlePath: config.server.bundlePath,
          rootDirectory: options.serverRootDirectory || Path.resolve(options.rootDirectory, config.server.rootDirectory),
          redirectNotFoundToIndex: config.server.redirectNotFoundToIndex,
        })
        subscriptions.add(devServer)
        promise = devServer.activate().then(function() {
          Helpers.colorsIfAppropriate(`Server is running on ${chalk.blue(`http://localhost:${serverPort}/`)}`)
        }).catch(function(error) {
          process.nextTick(function() {
            process.exit()
          })
          throw error
        })
      } else {
        promise = Helpers.build(pundle, options, config)
      }
      return promise.catch(function(error) {
        process.exitCode = 1
        pundle.context.report(error)
      })
    }
    catch (e) {
      process.exitCode = 1
      console.error(error)
    }
  })
  .parse(process.argv)
