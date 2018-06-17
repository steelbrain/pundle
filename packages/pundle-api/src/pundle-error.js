// @flow

import type { ErrorType, ErrorCode } from './types'

// in loc, line is 1 indexed but column is zero indexed
type Loc = { line: number, col: number }
export default class PundleError extends Error {
  type: ErrorType
  code: ErrorCode
  path: ?string
  loc: ?Loc
  constructor(type: ErrorType, code: ErrorCode, message: string, path: ?string = null, loc: ?Loc = null) {
    super(`PUNDLE ${type.toUpperCase()} ERROR code ${code}: ${message}`)
    this.type = type
    this.code = code
    this.path = path
    this.loc = loc
    this._updateStack()
  }
  _updateStack() {
    const { message, path, loc } = this

    this.stack = `${message}${path ? `\n  at ${path}${loc ? `:${loc.line}:${loc.col + 1}` : ''}` : ''}`
  }
}
