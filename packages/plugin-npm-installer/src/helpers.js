/* @flow */

export const MODULE_SEPARATOR_REGEX = /\/|\\/

export function getModuleName(moduleName: string): string {
  const chunks = moduleName.split(MODULE_SEPARATOR_REGEX)
  if (moduleName.slice(0, 1) === '@') {
    return `${chunks[0]}/${chunks[1]}`
  }
  return chunks[0]
}
