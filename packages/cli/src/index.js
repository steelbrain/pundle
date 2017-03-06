#!/usr/bin/env node
/* @flow */

import FS from 'sb-fs'
import Path from 'path'
import copy from 'sb-copy'
import chalk from 'chalk'
import command from 'sb-command'
import fileSize from 'filesize'
import difference from 'lodash.difference'
import reporterCLI from 'pundle-reporter-cli'
import PundleDevServer from 'pundle-dev'
import { CompositeDisposable } from 'sb-event-kit'

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
  .command('init [type]', 'Copy default Pundle configuration into root directory (type can be full or basic, defaults to basic)', async function(options, givenType) {
    const configType = givenType === 'full' ? 'full' : 'basic'
    Helpers.colorsIfAppropriate(chalk.cyan(`Using configuration type '${configType}'`))

    const vendorDirectory = Path.normalize(Path.join(__dirname, '..', 'vendor'))
    const successful = new Set()
    const everything = new Set()

    if (options.debug) {
      process.env.PUNDLE_DEBUG_REPORTS = '1'
    }

    try {
      const configSource = Path.join(vendorDirectory, `config-${configType}.js`)
      const configTarget = Path.resolve(options.rootDirectory, options.configFileName)
      if (!await FS.exists(configTarget)) {
        successful.add(Path.join(vendorDirectory, options.configFileName))
        await FS.writeFile(configTarget, await FS.readFile(configSource))
      }

      await copy(vendorDirectory, options.rootDirectory, {
        dotFiles: false,
        overwrite: false,
        failIfExists: false,
        filter(source) {
          const basename = Path.basename(source)
          if (basename === 'config-basic.js' || basename === 'config-full.js') {
            return false
          }
          if (FS.statSync(source).isFile()) {
            everything.add(source)
          }
          return true
        },
        tickCallback(source) {
          if (FS.statSync(source).isFile()) {
            successful.add(source)
          }
        },
      })
    } catch (error) {
      console.log(error)
      process.exitCode = 1
    } finally {
      if (successful.size) {
        console.log('These files were successfully copied into the project')
        console.log(Array.from(successful).map(e => `- ${Path.relative(vendorDirectory, e)}`).join('\n'))
      }

      const skippedFiles = difference(Array.from(everything), Array.from(successful))
      if (skippedFiles.length) {
        console.log('These files were skipped')
        console.log(skippedFiles.map(e => `- ${Path.relative(vendorDirectory, e)}`).join('\n'))
      }

      if (successful.has(Path.join(vendorDirectory, '.pundle.js'))) {
        console.log('\nNOTE: Remember to install the presets that you use\nin your configuration file in your project')
      }
    }
  })
  .default(function(options, ...commands) {
    if (options.debug) {
      process.env.PUNDLE_DEBUG_REPORTS = '1'
    }

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
    const Pundle = require('pundle')

    Pundle.create({
      rootDirectory: options.rootDirectory,
      configFileName: options.configFileName,
    }).then(function(pundle) {
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
        })
      } else {
        promise = pundle.generate(null, {
          sourceMap: config.output.sourceMap,
          sourceMapPath: config.output.sourceMapPath,
        }).then(async function(outputs) {
          const outputDirectory = Path.resolve(pundle.config.rootDirectory, config.output.rootDirectory)
          const outputFilePath = Path.resolve(outputDirectory, config.output.bundlePath)
          const outputSourceMapPath = Path.resolve(outputDirectory, config.output.sourceMapPath)

          const writeSourceMap = config.output.sourceMap && config.output.sourceMapPath !== 'inline'
          const outputFilePathExt = Path.extname(outputFilePath)
          const outputSourceMapPathExt = outputSourceMapPath.endsWith('.js.map') ? '.js.map' : Path.extname(outputSourceMapPath)

          outputs.forEach(function(output, index) {
            let contents = output.contents
            const currentFilePath = outputFilePath.slice(0, -1 * outputFilePathExt.length) + (index === 0 ? '' : `.${output.label}`) + outputFilePathExt
            const currentSourceMapPath = outputSourceMapPath.slice(0, -1 * outputSourceMapPathExt.length) + (index === 0 ? '' : `.${output.label}`) + outputSourceMapPathExt

            if (writeSourceMap) {
              contents += `//# sourceMappingURL=${Path.relative(outputDirectory, currentSourceMapPath)}\n`
            }
            FS.writeFileSync(currentFilePath, contents)
            Helpers.colorsIfAppropriate(`Wrote ${chalk.red(fileSize(output.contents.length))} to '${chalk.blue(Path.relative(options.rootDirectory, currentFilePath))}'`)
            if (writeSourceMap) {
              const sourceMap = JSON.stringify(output.sourceMap)
              FS.writeFileSync(currentSourceMapPath, sourceMap)
              Helpers.colorsIfAppropriate(`Wrote ${chalk.red(fileSize(sourceMap.length))} to '${chalk.blue(Path.relative(options.rootDirectory, currentSourceMapPath))}'`)
            }
          })
        })
      }
      return promise.catch(function(error) {
        process.exitCode = 1
        pundle.context.report(error)
      })
    }).catch(function(error) {
      process.exitCode = 1
      reporterCLI.callback(reporterCLI.defaultConfig, error)
    })
  })
  .parse(process.argv)
