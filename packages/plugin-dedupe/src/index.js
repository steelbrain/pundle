/* @flow */

import Path from 'path'
import semver from 'semver'
import { createResolver } from 'pundle-api'
import * as Helpers from './helpers'

const memoryCache = new Map()

export default createResolver(async function(config: Object, givenRequest: string, fromFile: ?string, cached: boolean = false) {
  if (givenRequest.slice(0, 1) === '.' || Path.isAbsolute(givenRequest)) {
    return null
  }
  const result = await this.resolve(givenRequest, fromFile, cached, true)
  if (!result || !result.targetManifest || !result.targetManifest.version) {
    return null
  }
  const moduleName = Helpers.getModuleName(givenRequest)
  const versions = Helpers.getModuleVersions(memoryCache, moduleName)
  const requestedVersion = Helpers.getRequiredVersion(result.sourceManifest, moduleName)

  // NOTE: if requestedVersion exists, use that, otherwise use targetManifest key to cache and then quit, caching will help for future resolves
  const cacheVersion = requestedVersion || result.targetManifest.version
  let matched = null
  for (const entry of versions) {
    if (semver.satisfies(entry.version, cacheVersion)) {
      matched = entry
      break
    }
  }
  if (!matched) {
    versions.add(result.targetManifest)
    matched = result.targetManifest
  }
  const newResult = {
    resolved: Path.join(matched.rootDirectory, Path.relative(result.targetManifest.rootDirectory, result.resolved)),
    sourceManifest: result.sourceManifest,
    targetManifest: matched,
  }
  return newResult
}, {}, false)
