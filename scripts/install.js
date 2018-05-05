const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const repoRoot = path.dirname(__dirname)
const packagesDirectories = ['packages']

const packagesMap = {}
packagesDirectories.forEach(function(packagesDirectory) {
  const packagesDirectoryPath = path.join(repoRoot, packagesDirectory)
  const contents = fs.readdirSync(packagesDirectoryPath)
  contents.forEach(function(packageName) {
    const packageDirectory = path.join(packagesDirectoryPath, packageName)
    const packageDirectoryStats = fs.statSync(packageDirectory)
    if (packageDirectoryStats.isDirectory()) {
      const packageManifest = require(path.join(packageDirectory, 'package.json'))
      packagesMap[packageManifest.name] = {
        dist: path.join(repoRoot, 'dist', packageName),
        root: path.join(repoRoot, 'node_modules', packageName),
      }
    }
  })
})

// top level linking
for (const [packageName, packageDirectories] of Object.entries(packagesMap)) {
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
