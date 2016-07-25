#!/usr/bin/env node
/* @flow */

require('process-bootstrap')('pundle', 'Pundle')

const Server = require('../')
const program = require('commander')
const manifest = require('../../package.json')
const debugInfo = require('debug')('Pundle:Info')
const debugError = require('debug')('Pundle:Error')

program
  .version(manifest.version)
  // Pundle Options
  .option('-e, --entry [path]', 'Pundle entry points', ['./index.js'])
  .option('-p, --path-type <number|filePath>', 'Output path type', /^(number|filePath)$/i, 'number')
  .option('-r, --root-directory <directory>', 'Root directory of which all imports would be relative of', process.cwd())
  .option('-m, --module-directory [directory]', 'Directories to search for during module lookup')
  // Generator options
  .option('-s, --source-map', 'Generate source map for output', false)
  .option('--project-name <name>', 'Project name to show in source map paths')
  // Server options
  .option('--port <number>', 'The port to listen on', 8056)
  .option('--hmr-path <path>', 'Path to listen for HMR on', '/_/bundle_hmr')
  .option('--bundle-path <path>', 'Path to serve bundle from', '/_/bundle.js')
  .option('--source-map-path <path>', 'Path to serve source maps from', '/_/bundle.js.map')
  .option('--source-root <path>', 'Optional source root to serve files on server from', process.cwd())
  // Watcher options
  .option('-w, --watch', 'Watch given entry files and recompile on change', false)
  .option('--use-polling', 'Use Polling method when watching files', false)
  .parse(process.argv)

new Server({
  server: {
    port: program.port,
    hmrPath: program.hmrPath,
    bundlePath: program.bundlePath,
    sourceRoot: program.sourceRoot !== 'false' ? program.sourceRoot : null,
    sourceMapPath: program.sourceMapPath,
    error(error) {
      debugError(error)
    },
    ready() {
      debugInfo(`Listening at http://localhost:${program.port}/`)
    },
  },
  pundle: {
    entry: program.entry,
    pathType: program.pathType,
    rootDirectory: program.rootDirectory,
    moduleDirectories: program.moduleDirectory,
  },
  watcher: {
    usePolling: program.usePolling,
  },
  generator: {
    sourceMap: program.sourceMap,
    projectName: program.projectName,
  },
}).activate().catch(function(e) {
  console.error(e)
  process.exit(1)
})
