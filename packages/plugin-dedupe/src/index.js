/* @flow */

import Path from 'path'
import semver from 'semver'
import { createResolver, getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { Context } from 'pundle-api/types'
import * as Helpers from './helpers'

const memoryCache = new Map()

export default createResolver(async function(context: Context, config: Object, givenRequest: string, fromFile: ?string, cached: boolean = false) {
  if (givenRequest.slice(0, 1) === '.' || Path.isAbsolute(givenRequest)) {
    return null
  }
  const result = await context.resolveAdvanced(givenRequest, fromFile, cached)
  const resultTargetManifest = result.targetManifest
  if (!result || !resultTargetManifest || !resultTargetManifest.version) {
    return null
  }
  const moduleName = Helpers.getModuleName(givenRequest)
  const versions = Helpers.getModuleVersions(memoryCache, moduleName)
  const requestedVersion = Helpers.getRequiredVersion(result.sourceManifest, moduleName)

  // NOTE: if requestedVersion exists, use that, otherwise use targetManifest key to cache and then quit, caching will help for future resolves
  const cacheVersion = requestedVersion || resultTargetManifest.version
  let matched = null
  for (const entry of versions) {
    if (semver.satisfies(entry.version, cacheVersion)) {
      if (matched && semver.gt(entry.version, matched.version)) {
        matched = entry
      } else if (!matched) {
        matched = entry
      }
    } else if (config.debug) {
      if (!fromFile) {
        // TODO: Handle this gracefully
        throw new Error(`${moduleName} v${entry.version} did not match ${cacheVersion}`)
      }
      context.report(new MessageIssue(`${moduleName} v${entry.version} did not match ${cacheVersion} from ${getRelativeFilePath(fromFile, context.config.rootDirectory)}`, 'info'))
    }
  }
  if (!matched) {
    matched = resultTargetManifest
    versions.add(matched)
  }
  const newResult = {
    filePath: Path.join(matched.rootDirectory, Path.relative(resultTargetManifest.rootDirectory, result.filePath)),
    sourceManifest: result.sourceManifest,
    targetManifest: matched,
  }
  return newResult
}, {
  debug: false,
}, false)
