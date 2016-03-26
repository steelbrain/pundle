'use strict'

/* @flow */

import Path from 'path'

export function getModuleId(filePath: string, rootDirectory: string, moduleRequest: ?string = null): string {
  const relativePath = Path.relative(rootDirectory, filePath)
  if (moduleRequest && filePath.indexOf('node_modules/') === 0) {
    return moduleRequest
  }
  return relativePath
}
