// @flow

import fs from 'sb-fs'
import path from 'path'
import pMap from 'p-map'

export default class ManifestRegistry {
  cache: Map<string, {| name: string, version: string, lastModified: number, manifest: Object |}> = new Map()
  sortedKeys: Array<string> = []
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

          if (!manifest.name || !manifest.version) {
            if (oldValue) {
              needsSorting = true
              this.cache.delete(directory)
            }
            return
          }
          needsSorting = true
          this.cache.set(directory, {
            name: manifest.name,
            version: manifest.version,
            lastModified,
            manifest,
          })
        }
      },
      { concurrency: 10 },
    )

    if (needsSorting) {
      this.sortedKeys = Array.from(this.cache.keys()).sort((a, b) => b.length - a.length)
    }
  }
}
