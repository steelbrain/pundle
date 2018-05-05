// @flow

import type { PundleErrorType, PundleErrorCode } from './types'

export default class PundleError extends Error {
  type: PundleErrorType
  code: PundleErrorCode
  path: string
  loc: ?Object
  constructor(type: PundleErrorType, code: PundleErrorCode, path: string, loc: ?Object = null, message: ?string = null) {
    super(`PUNDLE ${type.toUpperCase()} ERROR code ${code}`)
    this.type = type
    this.code = code
    this.path = path
    this.loc = loc

    // TODO: Fix loc
    this.stack = `${this.message}${message ? `: '${message}'` : ''}\n  at ${path}`
  }
}
