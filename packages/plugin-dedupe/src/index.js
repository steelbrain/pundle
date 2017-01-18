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
  let matchedExact = false
  for (const entry of versions) {
    if (semver.satisfies(entry.version, cacheVersion)) {
      if (matched && semver.gt(entry.version, matched.version)) {
        matched = entry
      } else if (!matched) {
        matched = entry
      }
    }
    if (!matchedExact && entry.version === result.targetManifest.version) {
      matchedExact = true
    }
  }
  if (!matched) {
    matched = result.targetManifest
  }
  if (!matchedExact) {
    versions.add(matched)
  }
  const newResult = {
    resolved: Path.join(matched.rootDirectory, Path.relative(result.targetManifest.rootDirectory, result.resolved)),
    sourceManifest: result.sourceManifest,
    targetManifest: matched,
  }
  return newResult
}, {}, false)
