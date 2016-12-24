/* @flow */

export const MODULE_SEPARATOR_REGEX = /\/|\\/

export function getModuleName(moduleName: string): string {
  return moduleName.split(MODULE_SEPARATOR_REGEX)[0]
}
