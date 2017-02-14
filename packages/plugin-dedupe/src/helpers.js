/* @flow */

export const MODULE_SEPARATOR_REGEX = /\/|\\/

export function getModuleName(moduleName: string): string {
  const chunks = moduleName.split(MODULE_SEPARATOR_REGEX)
  if (moduleName.slice(0, 1) === '@') {
    return `${chunks[0]}/${chunks[1]}`
  }
  return chunks[0]
}

export function getModuleVersions(memoryCache: Map<string, Set<Object>>, moduleName: string): Set<Object> {
  let versions = memoryCache.get(moduleName)
  if (!versions) {
    memoryCache.set(moduleName, versions = new Set())
  }
  return versions
}

export function getRequiredVersion(manifest: Object, moduleName: string): ?string {
  if (manifest && manifest.dependencies && manifest.dependencies[moduleName]) {
    return manifest.dependencies[moduleName]
  }
  if (manifest && manifest.devDependencies && manifest.devDependencies[moduleName]) {
    return manifest.devDependencies[moduleName]
  }
  return null
}
