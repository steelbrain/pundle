/* @flow */

export const MODULE_NAME_REGEX = /^([^\/\\\.]+)/

export function isNPMError(stdoutContents: string): boolean {
  return stdoutContents.indexOf('npm ERR') !== -1
}

export function getModuleName(moduleName: string): ?string {
  const matches = MODULE_NAME_REGEX.exec(moduleName)
  return matches ? matches[1] : null
}
