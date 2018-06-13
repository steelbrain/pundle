#!/usr/bin/env node
// @flow

import fs from 'sb-fs'
import path from 'path'
import pMap from 'p-map'
import get from 'lodash/get'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
import uniq from 'lodash/uniq'
import chalk from 'chalk'
import mkdirp from 'mkdirp'
import express from 'express'
import minimist from 'minimist'
import gzipSize from 'gzip-size'
import stripAnsi from 'strip-ansi'
import prettyBytes from 'pretty-bytes'
import { getPundle, getWatcher } from 'pundle-core'
import { getPundleDevMiddleware, getChunksAffectedByImports } from 'pundle-dev-middleware'
import type { Context, ChunksGenerated } from 'pundle-api'

import { getNextPort } from './helpers'

const PUNDLE_ARGS = ['directory', 'configFilePath', 'configLoadFile']
const OMIT_ARGS = PUNDLE_ARGS.concat(['_', 'dev', 'watch'])

const argv = minimist(process.argv.slice(2), {
  string: ['configFilePath', 'directory'],
  boolean: ['configLoadFile'],
  default: {
    dev: {},
    watch: {},
    configLoadFile: true,
  },
})

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

// TODO: Use report for all errors
// TODO: Try to break this with errors in different places
let pundle
async function main() {
  if (argv.help || argv.h) {
    process.exit(1)
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
        // TODO: Report instead
        console.error(error)
      }
      await generateForWatcher({ pundle, job, changed: null })
      return
    }
    log(`Compiling (${headerText})`)
    console.time('Compiled')
    const result = await pundle.execute()
    console.timeEnd('Compiled')
    await writeCompiledChunks(pundle.context, result)
    pundle.dispose()
    return
  }

  const specifiedDevPort = parseInt(get(argv, 'dev.port', 0), 10)
  const devPort = specifiedDevPort || 3000
  const devHost = get(argv, 'dev.host', '127.0.0.1')

  const devPortToUse = await getNextPort(devPort)
  if (devPortToUse !== devPort && specifiedDevPort) {
    log(chalk.yellow(`Unable to listen on port ${specifiedDevPort} - Is another program using that port?`))
  }

  log(`Starting Dev Server at ${chalk.blue(`http://localhost:${devPortToUse}/`)} (${headerText})`)

  const app = express()
  app.use(
    await getPundleDevMiddleware({
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
    }),
  )
  await new Promise((resolve, reject) => {
    const server = app.listen(devPort, devHost)
    server.on('error', reject)
    server.on('listening', resolve)
  })
  log('Started Successfully')
}

main().catch(error => {
  if (pundle) {
    pundle.dispose()
  }
  console.error(error)
})
