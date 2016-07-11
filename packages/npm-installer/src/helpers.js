/* @flow */

export function isNPMError(stdoutContents: string): boolean {
  return stdoutContents.indexOf('npm ERR') !== -1
}

export function getModuleName(moduleName: string): string {
  const index = moduleName.indexOf('/')
  if (index === -1) {
    return moduleName
  }
  return moduleName.substr(0, index)
}
