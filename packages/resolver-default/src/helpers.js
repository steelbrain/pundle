/* @flow */

import Path from 'path'
import resolve from 'resolve'
import memoize from 'sb-memoize'
import fileSystem from 'sb-fs'
import type { PundleConfig } from 'pundle-api/types'

export const MODULE_SEPARATOR_REGEX = /\/|\\/

export function promisedResolve(request: string, options: Object): Promise<?string> {
  return new Promise(function(resolvePromise, rejectPromise) {
    resolve(request, options, function(error, path) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        rejectPromise(error)
      } else {
        resolvePromise(path || null)
      }
    })
  })
}

export function isModuleRequested(request: string): boolean {
  return !(Path.isAbsolute(request) || request.substr(0, 1) === '.')
}
export function isModuleOnly(request: string): boolean {
  const chunks = request.split(MODULE_SEPARATOR_REGEX)
  return chunks.length === 1
}

// Spec:
// Keep cache of each chunk of path processed
// Cut path into half based on module directories, and only use the right side of it
// Cut path into half based on rootDirectory, do not search outside the root directory if item is INSIDE it

const findManifestCached = memoize(async function (givenFileDirectory: string, config: Object, cached: boolean, pundleConfig: PundleConfig): Promise<?string> {
  let fileDirectory = givenFileDirectory
  if (fileDirectory.slice(-1) === '/') {
    fileDirectory = fileDirectory.slice(0, -1)
  }

  let limitPath = ''

  if (fileDirectory.indexOf(pundleConfig.rootDirectory) === 0) {
    limitPath = pundleConfig.rootDirectory
  } else {
    for (const moduleDirectory of config.modulesDirectories) {
      const lastIndex = fileDirectory.lastIndexOf(moduleDirectory)
      if (lastIndex !== -1) {
        limitPath = fileDirectory.slice(0, lastIndex + moduleDirectory.length)
        break
      }
    }
  }

  const manifestPath = Path.join(fileDirectory, 'package.json')
  try {
    await fileSystem.stat(manifestPath)
    return manifestPath
  } catch (_) { /* Ignore if not found */ }

  // If we've reached path limit, or / on nix or :\ on windows
  if (fileDirectory === limitPath || fileDirectory === '/' || fileDirectory.slice(-2) === ':\\') {
    return null
  }
  return await findManifestCached(Path.dirname(fileDirectory), config, cached, pundleConfig)
}, { async: true })

export function findManifest(fileDirectory: string, config: Object, cached: boolean, pundleConfig: PundleConfig): Promise<?string> {
  if (!cached) {
    const cachedValue = findManifestCached.getCache([fileDirectory, config, cached, pundleConfig])
    if (typeof cachedValue === 'string') {
      findManifestCached.deleteCache([Path.dirname(cachedValue), config, cached, pundleConfig])
    }
  }
  return findManifestCached(fileDirectory, config, cached, pundleConfig)
}

// Spec:
// Keep a rootDirectory in manifest
// Return empty object if manifest is not found, parsed manifest contents otherwise
const getManifestCached = memoize(async function(fileDirectory: string, config: Object, cached: boolean, pundleConfig: PundleConfig): Promise<Object> {
  let manifest = {}
  const manifestPath = await findManifest(fileDirectory, config, cached, pundleConfig)
  if (manifestPath) {
    manifest = JSON.parse(await fileSystem.readFile(manifestPath))
    manifest.rootDirectory = Path.dirname(manifestPath)
  }
  return manifest
}, { async: true })

export function getManifest(fileDirectory: string, config: Object, cached: boolean, pundleConfig: PundleConfig): Promise<Object> {
  if (!cached) {
    const cachedValue = getManifestCached.getCache([fileDirectory, config, cached, pundleConfig])
    if (typeof cachedValue === 'string') {
      getManifestCached.deleteCache([Path.dirname(cachedValue), config, cached, pundleConfig])
    }
  }
  return getManifestCached(fileDirectory, config, cached, pundleConfig)
}
