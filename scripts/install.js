#!/usr/bin/env node

const fs = require('fs')
const rimraf = require('rimraf')
const { getPackages } = require('./_common')

for (const [packageName, packageDirectories] of Object.entries(getPackages())) {
  let stats
  let status = 'none'
  try {
    stats = fs.lstatSync(packageDirectories.root)
  } catch (_) {
    /* No Op */
  }
  if (!stats) {
    status = 'link'
  } else if (!stats.isSymbolicLink()) {
    status = 'relink'
  }
  if (status === 'none') {
    let realpath
    try {
      realpath = fs.realpathSync(packageDirectories.root)
    } catch (_) {
      /* No Op */
    }
    if (realpath !== packageDirectories.dist) {
      status = 'relink'
    }
  }

  if (status === 'relink') {
    console.log('[Package-Linker] Relinking', packageName, 'at top level')
    rimraf.sync(packageDirectories.root)
  } else if (status === 'link') {
    console.log('[Package-Linker] Linking', packageName, 'at top level')
  } else {
    console.log('[Package-Linker] Ignoring', packageName, 'at top level')
  }
  if (status !== 'none') {
    fs.symlinkSync(packageDirectories.dist, packageDirectories.root)
  }
}
