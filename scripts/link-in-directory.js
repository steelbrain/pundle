#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const { getPackages } = require('./_common')

let showHelp = false
let directory = process.argv[2]
if (!directory) {
  showHelp = true
} else {
  directory = path.resolve(directory)
  try {
    fs.accessSync(directory, fs.R_OK)
  } catch (_) {
    showHelp = true
  }
}

if (showHelp) {
  console.log('Usage:')
  console.log(`  link-in-directory <targetDirectory>`)
  process.exit(1)
}

const targetNodeModules = path.join(directory, 'node_modules')
console.log(`Working in ${targetNodeModules}`)
try {
  fs.accessSync(targetNodeModules, fs.W_OK)
} catch (_) {
  console.error(`Unable to write to destination folder. Does it exist? Is it writable?`)
  process.exit(1)
}
for (const [packageName, packageDirectory] of Object.entries(getPackages())) {
  console.log(`  Linking ${packageName}`)
  const targetPath = path.join(targetNodeModules, packageName)
  rimraf.sync(targetPath)
  fs.symlinkSync(packageDirectory, targetPath)
}
