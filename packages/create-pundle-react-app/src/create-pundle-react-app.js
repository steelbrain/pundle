#!/usr/bin/env node
// @flow

import path from 'path'
import minimist from 'minimist'
import coolTrim from 'cool-trim'
import { createApp } from 'pundle-core-create-app'
import manifest from '../package.json'

async function main() {
  const argv = minimist(process.argv.slice(2))

  if (argv.v || argv.version) {
    console.log(`${manifest.version}`)
    return
  }
  if (argv.help || argv.h || !argv._.length) {
    console.log(coolTrim`
        Usage: ${manifest.name} <project-directory> [options]
        Options:

          -h, --help              Show this help text
          -v, --version           Show version number of ${manifest.name}
    `)
    return
  }

  const [name] = argv._

  await createApp({
    title: 'Pundle React App',
    name,
    directory: process.cwd(),
    from: path.join(path.dirname(__dirname), 'template'),
  })
}

main().catch(console.error)
