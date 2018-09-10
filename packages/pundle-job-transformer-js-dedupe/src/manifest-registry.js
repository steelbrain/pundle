// @flow

import fs from 'sb-fs'
import path from 'path'
import pMap from 'p-map'

export default class ManifestRegistry {
  cache: Map<string, {| version: string, lastModified: number, manifest: Object |}> = new Map()
  async load(directories: Array<string>) {
    await pMap(directories, async directory => {
      const manifestPath = path.join(directory, 'package.json')
      let stats
      try {
        stats = await fs.stat(manifestPath)
      } catch (err) {
        if (err && err.code !== 'ENOENT') {
          throw err
        }
        return
      }
      console.log(stats)
    })
    console.log(directories)
  }
}
