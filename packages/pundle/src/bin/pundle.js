#!/usr/bin/env node
/* @flow */

require('process-bootstrap')('pundle', 'Pundle')

const PundleCLI = require('../cli')
const program = require('commander')
const manifest = require('../../package.json')

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
  // Output options
  .option('-o, --output-file <path>', 'The path to store generated output at', './bundle.js')
  .option('--source-map-inline', 'Wether to output inline source map', false)
  .option('--source-map-output-file <path>', 'The path to store source map of generated output at', './bundle.js.map')
  // Watcher options
  .option('-w, --watch', 'Watch given entry files and recompile on change', false)
  .option('--use-polling', 'Use Polling method when watching files', false)
  .parse(process.argv)

new PundleCLI({
  cli: {
    watch: program.watch,
    outputFile: program.outputFile,
    sourceMapInline: program.sourceMapInline,
    sourceMapOutputFile: program.sourceMapOutputFile,
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
