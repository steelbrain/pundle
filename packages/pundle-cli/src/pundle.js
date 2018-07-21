#!/usr/bin/env node
// @flow

import fs from 'sb-fs'
import http from 'http'
import https from 'https'
import path from 'path'
import pMap from 'p-map'
import mapValues from 'lodash/mapValues'
import get from 'lodash/get'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
import uniq from 'lodash/uniq'
import chalk from 'chalk'
import mkdirp from 'mkdirp'
import express from 'express'
import minimist from 'minimist'
import coolTrim from 'cool-trim'
import gzipSize from 'gzip-size'
import stripAnsi from 'strip-ansi'
import prettyBytes from 'pretty-bytes'
import { getPundle, getWatcher } from 'pundle-core'
import { getPundleDevMiddleware, getChunksAffectedByImports } from 'pundle-dev-middleware'
import type { Context, ChunksGenerated } from 'pundle-api'

import manifest from '../package.json'
import { getNextPort, getStaticMappings } from './helpers'

const PUNDLE_ARGS = ['directory', 'configFilePath', 'configLoadFile']
const OMIT_ARGS = PUNDLE_ARGS.concat(['_', 'dev', 'watch', 'debug'])

const argv = mapValues(
  minimist(process.argv.slice(2), {
    string: ['configFilePath', 'directory'],
    boolean: ['configLoadFile'],
    default: {
      dev: {},
      watch: {},
      configLoadFile: true,
    },
  }),
  value => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  },
)

const pundleArgs = pick(argv, PUNDLE_ARGS)
const pundleConfig = omit(argv, OMIT_ARGS)

function log(contents: string): void {
  console.log(chalk.supportsColor ? contents : stripAnsi(contents))
}

async function writeFile(context: Context, filePath: string, contents: string | Buffer): Promise<void> {
  await new Promise(function(resolve, reject) {
    mkdirp(path.dirname(filePath), function(err) {
      if (err) {
        reject(err)
      } else resolve()
    })
  })
  await fs.writeFile(filePath, contents)
  const gzipSizeOfFile = await gzipSize(contents)
  log(
    `  Writing '${chalk.blue(path.relative(context.config.rootDirectory, filePath))}' ${chalk.green(
      prettyBytes(contents.length),
    )} (${chalk.red(prettyBytes(gzipSizeOfFile))} gzipped) `,
  )
}
async function logFile(filePath: string, contents: string | Buffer): Promise<void> {
  const gzipSizeOfFile = await gzipSize(contents)
  log(
    `  ${chalk.blue(filePath)} - ${chalk.green(prettyBytes(contents.length))} (${chalk.red(
      prettyBytes(gzipSizeOfFile),
    )} gzipped) `,
  )
}
async function writeCompiledChunks(context: Context, generated: ChunksGenerated) {
  await pMap(
    generated.outputs,
    async ({ filePath, sourceMap, contents }) => {
      if (!filePath) {
        // Ignore this one
        return
      }
      await writeFile(context, path.resolve(generated.directory, filePath), contents)
      if (sourceMap && sourceMap.filePath) {
        await writeFile(context, path.resolve(generated.directory, sourceMap.filePath), sourceMap.contents)
      }
    },
    { concurrency: 1 },
  )
}
async function generateForWatcher({ pundle, job, changed }) {
  const transformedJob = await pundle.transformJob(job)
  const chunks = Array.from(transformedJob.chunks.values())
  const chunksToRegenerate = changed ? getChunksAffectedByImports(job, chunks, changed) : chunks
  await writeCompiledChunks(pundle.context, await pundle.generate(job, chunksToRegenerate))
}

// TODO: Try to break this with errors in different places
let pundle
async function main() {
  if (argv.v || argv.version) {
    console.log(`Pundle v${manifest.version} - The Next Generation Module Bundler`)
    process.exit(0)
  }
  if (argv.help || argv.h) {
    log(coolTrim`
    Usage: pundle [...options]

    These are the common top level options:
      < no parameter >            Compile the contents of a project and write to output directory
      --watch                     Just like compile but watches and recompiles on changes
      --dev                       Compile the contents and start an http server on a port (3000 by default)
                                  but do not write to output directory
      --directory <path>          Start Pundle in a specific directory (supports other options)
      --debug                     Shows detailed error information
      --version                   Print the version of the program
      --help                      Show this help text

    Here are some of Pundle's config parameters (but others/all supported by Pundle can be used in dot notation):
      --directory                 Start pundle in a specific directory (is process.cwd() by default)
      --configFilePath            File path to Pundle config file (by default it's 'pundle.config.js')
                                  resolved from above mentioned directory
      --configLoadFile            Controls config loading behavior, set to false to disable loading
                                  config file
      --dev.port                  TCP port to listen for dev server connections on (3000 by default)
      --dev.host                  Hostname/IP to listen for dev server connections on (localhost by default)
      --dev.hmr                   Controls availability of HMR APIs in dev server (enabled by default)
      --dev.lazy                  Controls if the dev server waits for first request to compile or
                                  compiles instantly
      --dev.static local::public  Allows mapping local static directories to the dist server. May be specified
                                  multiple times. Paths may be relative to pundle config's root directory.
                                  Use '::' to separate local and server paths. (eg. --dev.static ./static::/assets)
      --dev.singlepage            Redirects all non-404 requests to /index.html. Useful for react single page
                                  apps
      --dev.https.key             Path to private key for https server
      --dev.https.cert            Path to certificate file for https server
      --watch.adapter             Choose between nsfw and chokidar. Adapters used to watch filesystem changes
      --cache                     Controls whether to enable or disable caching (enabled by default)
      --cache.reset               Controls whether to reset cache on boot
      --output.rootDirectory      Override control defined output directory to use this one

    Environment variables Pundle responds to:
      NODE_ENV                    Tells Pundle to use debug/production behavior
      PUNDLE_DEBUG=1              Prints detailed stack traces to console (set by --debug opt)
      PUNDLE_DEBUG_RESOLVER=1     Prints from/to resolution details for debugging large bundles
    `)
    process.exit(1)
  }

  if (argv.debug) {
    process.env.PUNDLE_DEBUG = '1'
  }

  pundle = await getPundle({
    ...pundleArgs,
    config: pundleConfig,
  })

  const isDev = argv.dev === true || Object.keys(argv.dev).length > 0
  const isWatch = argv.watch === true || Object.keys(argv.watch).length > 0

  const watchAdapter = get(argv, 'watch.adapter')
  const watchConfig = { ...(watchAdapter ? { adapter: watchAdapter } : {}) }

  const headerText = `${pundle.context.config.cache.enabled ? 'with' : 'without'}${
    pundle.context.config.cache.reset ? ' resetted' : ''
  } cache${watchAdapter ? ` and with adapter ${watchAdapter}` : ''}`

  try {
    if (!isDev) {
      if (isWatch) {
        log(`Watching (${headerText})`)
        const { job, initialCompile } = await getWatcher({
          ...watchConfig,
          pundle,
          generate({ changed }) {
            const changedFiles = uniq(changed.map(i => i.filePath)).map(i =>
              path.relative(pundle.context.config.rootDirectory, i),
            )
            log(`Files affected:\n${changedFiles.map(i => `  - ${i}`).join('\n')}`)
            return generateForWatcher({ pundle, job, changed })
          },
        })
        try {
          await initialCompile()
        } catch (error) {
          await pundle.report(error)
        }
        await generateForWatcher({ pundle, job, changed: null })
        return
      }
      log(`Compiling (${headerText})`)
      console.time('Compiled')
      const result = await pundle.execute()
      console.timeEnd('Compiled')
      pundle.dispose()
      await writeCompiledChunks(pundle.context, result)
      return
    }

    const devPort = parseInt(get(argv, 'dev.port', 0), 10) || 3000
    const devHost = get(argv, 'dev.host', '127.0.0.1')
    const devHttps = get(argv, 'dev.https', null)
    const staticMappings = getStaticMappings(pundle, argv)

    const devPortToUse = await getNextPort(devPort, devHost)
    if (devPortToUse !== devPort) {
      log(chalk.yellow(`Unable to listen on port ${devPort} - Is another program using that port?`))
    }
    if (devHttps && (typeof devHttps.cert !== 'string' || typeof devHttps.key !== 'string')) {
      throw new Error('--dev.https.cert & --dev.https.key must be valid strings')
    } else {
      devHttps.key = await fs.readFile(devHttps.key)
      devHttps.cert = await fs.readFile(devHttps.cert)
    }

    log(`Starting Dev Server at ${chalk.blue(`http://localhost:${devPortToUse}/`)} (${headerText})`)
    if (staticMappings.length) {
      log(`Static mappings:`)
      staticMappings.sort((a, b) => a.remote.length - b.remote.length).forEach(item => {
        log(`  ${item.remote} ~> ${item.local}`)
      })
    }

    const app = express()
    const middlewarePromise = getPundleDevMiddleware({
      ...pundleArgs,
      publicPath: '/',
      ...argv.dev,
      config: pundleConfig,
      watchConfig,
      changedCallback(changed) {
        const changedFiles = uniq(changed.map(i => i.filePath)).map(i =>
          path.relative(pundle.context.config.rootDirectory, i),
        )
        log(`  Files affected:\n${changedFiles.map(i => `    - ${i}`).join('\n')}`)
      },
      generatedCallback(url, contents) {
        logFile(url, contents).catch(pundle.report)
      },
    })
    app.use(function(req, res, next) {
      middlewarePromise.then(() => next(), next)
    })
    await new Promise((resolve, reject) => {
      const server = devHttps ? https.createServer(devHttps, app) : http.createServer(app)
      server.listen(devPortToUse, devHost)
      server.on('error', reject)
      server.on('listening', resolve)
    })
    app.use(await middlewarePromise)
    staticMappings.sort((a, b) => b.remote.length - a.remote.length).forEach(item => {
      app.use(item.remote, express.static(item.local))
    })
    if (get(argv, 'dev.singlepage')) {
      app.use(function(req, res, next) {
        if (req.url !== '/index.html') {
          req.url = '/index.html'
          middlewarePromise.then(callback => callback(req, res, next)).catch(next)
        } else next()
      })
    }
    log('Started Successfully')
  } catch (error) {
    await pundle.report(error)
    pundle.dispose()
  }
}

main().catch(error => {
  if (pundle) {
    pundle.dispose()
  }
  console.error(error)
})
