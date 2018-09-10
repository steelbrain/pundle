// @flow

import fs from 'sb-fs'
import path from 'path'
import pMap from 'p-map'
import semver from 'semver'
import memoize from 'sb-memoize'

type Package = {|
  name: string,
  version: string,
  directory: string,
  lastModified: number,
  dependencies: Object,
|}
export default class ManifestRegistry {
  cache: Map<string, Package> = new Map()
  sortedKeys: Array<string> = []

  updateCache() {
    this.sortedKeys = Array.from(this.cache.keys()).sort((a, b) => b.length - a.length)
    this.getManifestForPath.clearCache()
    this.getPackageMatchingSemver.clearCache()
  }

  getManifestForPath: string => ?Package = memoize((filePath: string) => {
    const rootDirectory = this.sortedKeys.find(item => filePath.startsWith(item))
    if (rootDirectory) {
      // Avoid node_modules with no rootDirectory to be associated with root level manifest
      if (filePath.includes('node_modules') && !rootDirectory.includes('node_modules')) {
        return null
      }
      return this.cache.get(rootDirectory)
    }
    return null
  })

  getPackageMatchingSemver: (string, string) => ?Package = memoize((name: string, requestedVersion: string) => {
    const matching = []
    this.cache.forEach(item => {
      if (item.name === name && item.version && semver.satisfies(item.version, requestedVersion)) {
        matching.push(item)
      }
    })
    if (matching.length <= 1) {
      return null
    }
    return matching.sort((a, b) => semver.compare(b.version, a.version))[0]
  })

  async load(directories: Array<string>) {
    let needsSorting = false

    await pMap(
      directories,
      async directory => {
        const manifestPath = path.join(directory, 'package.json')
        let stats
        try {
          stats = await fs.stat(manifestPath)
        } catch (err) {
          if (err && err.code !== 'ENOENT') {
            throw err
          }
          // Ignore non-manifest modules
          return
        }

        const oldValue = this.cache.get(directory)
        const lastModified = Math.trunc(stats.mtime.getTime() / 1000)

        const changed = !oldValue || oldValue.lastModified !== lastModified
        if (changed) {
          const contents = await fs.readFile(manifestPath, 'utf8')
          let manifest
          try {
            manifest = JSON.parse(contents)
          } catch (error) {
            throw new Error(`Malformed JSON file found at '${manifestPath}'`)
          }

          if (!manifest) {
            if (oldValue) {
              needsSorting = true
              this.cache.delete(directory)
            }
            return
          }

          needsSorting = true
          this.cache.set(directory, {
            name: manifest.name || path.basename(directory),
            version: manifest.version,
            directory,
            lastModified,
            dependencies: { ...manifest.devDependencies, ...manifest.peerDependencies, ...manifest.dependencies },
          })
        }
      },
      { concurrency: 10 },
    )

    if (needsSorting) {
      this.updateCache()
    }
  }
}
