#!/usr/bin/env node
// @flow

import fs from 'sb-fs'
import path from 'path'
import pMap from 'p-map'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
import chalk from 'chalk'
import mkdirp from 'mkdirp'
import minimist from 'minimist'
import gzipSize from 'gzip-size'
import stripAnsi from 'strip-ansi'
import prettyBytes from 'pretty-bytes'
import { getPundle, getWatcher } from 'pundle-core'
import type { Context, ChunksGenerated } from 'pundle-api'

const PUNDLE_ARGS = ['directory', 'configFilePath', 'configLoadFile']
const OMIT_ARGS = PUNDLE_ARGS.concat(['_', 'dev', 'watch'])

const argv = minimist(process.argv.slice(2), {
  string: ['configFilePath', 'directory'],
  boolean: ['configLoadFile'],
  default: {
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

async function main() {
  if (argv.help || argv.h) {
    process.exit(1)
  }

  if (argv.watch || !argv.dev) {
    const pundle = await getPundle({
      ...pundleArgs,
      config: pundleConfig,
    })
    if (argv.watch) {
      console.log('Watcher mode')
      const { initialCompile } = await getWatcher({
        pundle,
        tick({ newFile }) {
          console.log('ticked', newFile.filePath)
        },
        ready() {
          console.log('Ready!')
        },
        generate() {
          console.log('Compiled & ready to be generated')
        },
      })
      await initialCompile()
    } else {
      console.log('Compiling')
      console.time('Compiled')
      const result = await pundle.execute()
      console.timeEnd('Compiled')
      await writeCompiledChunks(pundle.context, result)
      pundle.dispose()
    }
  } else {
    console.log('dev mode')
  }
}

main().catch(console.error)
