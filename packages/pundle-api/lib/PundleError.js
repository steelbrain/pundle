// @flow

import type { ErrorType, ErrorCode } from './types'

export default class PundleError extends Error {
  type: ErrorType
  code: ErrorCode
  path: string
  loc: ?Object
  constructor(type: ErrorType, code: ErrorCode, path: string, loc: ?Object = null, message: ?string = null) {
    super(`PUNDLE ${type.toUpperCase()} ERROR code ${code}`)
    this.type = type
    this.code = code
    this.path = path
    this.loc = loc

    // TODO: Fix loc
    this.stack = `${this.message}${message ? `: ${message}` : ''}\n  at ${path}`
  }
}
