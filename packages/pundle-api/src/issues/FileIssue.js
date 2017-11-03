// @flow

import invariant from 'assert'
import { VALID_SEVERITIES } from '../common'
import type { Severity } from '../types'

// NOTE: This class accepts lines as 1-indexed and columns as 0-indexed
export default class FileIssue {
  file: string
  line: number
  column: number
  contents: string
  message: string
  severity: string

  // For compatibility with Error object
  stack: string

  constructor({
    file,
    contents,
    line,
    column,
    message,
    severity = 'error',
  }: {
    file: string,
    contents: string,
    line: number,
    column: number,
    message: string,
    severity: Severity,
  }) {
    invariant(typeof file === 'string' && file, 'File must be a valid string')
    invariant(typeof contents === 'string' && contents, 'options.contents must be a valid string')
    invariant(typeof line === 'number' && line > -1, 'options.line must be a valid number')
    invariant(typeof column === 'number' && column > -1, 'options.column must be a valid number')
    invariant(typeof message === 'string' && message, 'options.message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'options.severity must be valid')

    this.file = file
    this.line = line
    this.column = column
    this.contents = contents
    this.message = message
    this.severity = severity
  }
  get stack(): string {
    return `FileIssue: ${this.message}\n    at ${this.file}:${this.line}:${this.column}`
  }
}
