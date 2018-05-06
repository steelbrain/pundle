// @flow

import type { ErrorType, ErrorCode } from './types'

// in loc, line is 1 indexed but column is zero indexed
type Loc = { line: number, col: number }
export default class PundleError extends Error {
  type: ErrorType
  code: ErrorCode
  path: string
  loc: ?Loc
  constructor(type: ErrorType, code: ErrorCode, path: string, loc: ?Loc = null, message: ?string = null) {
    super(`PUNDLE ${type.toUpperCase()} ERROR code ${code}`)
    this.type = type
    this.code = code
    this.path = path
    this.loc = loc

    // TODO: Fix loc
    this.stack = `${this.message}${message ? `: ${message}` : ''}\n  at ${path}`
  }
}
