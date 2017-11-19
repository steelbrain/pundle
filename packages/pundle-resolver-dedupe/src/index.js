// @flow

import path from 'path'
import semver from 'semver'
import { createResolver } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  const cachedManifests: {
    [string]: ?Object,
  } = {}
  const moduleVersionMap: {
    [string]: Array<{|
      hits: number,
      root: string,
      version: string,
    |}>,
  } = {}

  const queue: { [string]: Promise<?Object> } = {}
  async function getManifest(root: string): Promise<?Object> {
    if (typeof cachedManifests[root] === 'undefined') {
      let manifest = null
      try {
        // $FlowIgnore: Dynamic import
        manifest = require(path.join(root, 'package.json')) // eslint-disable-line global-require,import/no-dynamic-require
      } catch (error) {
        if (error && error.code !== 'MODULE_NOT_FOUND') {
          throw error
        }
      }
      cachedManifests[root] = manifest
    }
    return cachedManifests[root]
  }
  function getManifestQueued(root: string) {
    if (!queue[root]) {
      queue[root] = getManifest(root)
    }
    return queue[root]
  }

  return createResolver({
    name: 'pundle-resolver-dedupe',
    version,
    async callback(context, options, payload) {
      const { resolved, resolvedRoot } = payload

      if (!resolved || !resolvedRoot) return
      const resolvedManifest = await getManifestQueued(resolvedRoot)
      const requestManifest = await getManifestQueued(payload.requestRoot)

      if (resolvedManifest && resolvedManifest.name && resolvedManifest.version) {
        if (!moduleVersionMap[resolvedManifest.name]) {
          moduleVersionMap[resolvedManifest.name] = []
        }
        const manifestMap = moduleVersionMap[resolvedManifest.name]
        if (!manifestMap.find(m => m.version === resolvedManifest.version)) {
          manifestMap.push({
            hits: 0,
            root: resolvedRoot,
            version: resolvedManifest.version,
          })
        }
      } else return

      if (!requestManifest || !requestManifest.dependencies) return

      const manifests = moduleVersionMap[resolvedManifest.name].sort(semver.rcompare).sort((a, b) => b.hits - a.hits)
      if (manifests.length === 1) return

      const chosen = manifests.find(manifest =>
        semver.satisfies(manifest.version, requestManifest.dependencies[resolvedManifest.name]),
      )
      if (chosen) {
        const relative = path.resolve(chosen.root, path.relative(resolvedRoot, resolved))
        chosen.hits++
        payload.resolved = relative
        payload.resolvedRoot = chosen.root
      }
    },
    defaultOptions: {
      debug: false,
    },
  })
}
