#!/usr/bin/env node

const path = require('path')
const childProcess = require('child_process')
const minimist = require('minimist')
const { getPackages } = require('./_common')

const argv = minimist(process.argv.slice(2))
let packages = getPackages()

const [packageName] = argv._
if (packageName) {
  if (!packages[packageName]) {
    console.error(`Package '${packageName}' is not recognized`)
    process.exit(1)
  }
  packages = { [packageName]: packages[packageName] }
}
delete packages['--test-package--']

function getLinesFromOutput(chunk) {
  return chunk
    .toString()
    .trim()
    .split('\n')
}

for (const [currentPackage, packageDirectory] of Object.entries(packages)) {
  const args = [
    path.join(packageDirectory, 'src'),
    '-o',
    path.join(packageDirectory, 'lib'),
    '--root',
    path.dirname(__dirname),
  ]
  if (argv.w || argv.watch) {
    args.push('-w')
  }
  const spawnedProcess = childProcess.spawn(`sb-babel-cli`, args, {
    stdio: [process.stdin, 'pipe', 'pipe'],
  })
  spawnedProcess.stdout.on('data', function(chunk) {
    getLinesFromOutput(chunk).forEach(line => {
      console.log(`${currentPackage}: ${line}`)
    })
  })
  spawnedProcess.stderr.on('data', function(chunk) {
    getLinesFromOutput(chunk).forEach(line => {
      console.error(`${currentPackage}: ${line}`)
    })
  })
}
