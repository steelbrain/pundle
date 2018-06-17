const fs = require('fs')
const path = require('path')

function getPackages() {
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
        packagesMap[packageManifest.name] = packageDirectory
      }
    })
  })
  return packagesMap
}

module.exports = { getPackages }
