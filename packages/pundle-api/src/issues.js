// @flow

import invariant from 'assert'

const VALID_SEVERITIES = new Set(['info', 'warning', 'error'])

// NOTE: This class accepts lines as 1-indexed and columns as 0-indexed
export class FileIssue {
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
    severity: string,
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

export class MessageIssue {
  message: string
  severity: string

  // For compatibility with Error object
  stack: string
  constructor(message: string, severity: string = 'error') {
    invariant(typeof message === 'string' && message, 'options.message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'options.severity must be valid')

    this.message = message
    this.severity = severity
  }
  get stack(): string {
    return `MessageIssue: ${this.severity.toUpperCase()}: ${this.message}`
  }
}

// NOTE: This class accepts lines as 1-indexed and columns as 0-indexed
export class FileMessageIssue {
  file: string
  line: ?number
  column: ?number
  message: string

  // For compatibility with Error object
  stack: string
  constructor({ file, message, line, column }: { file: string, message: string, line?: ?number, column?: ?number }) {
    invariant(typeof file === 'string' && file, 'options.file must be a valid string')
    invariant(typeof message === 'string' && message, 'options.message must be a valid string')
    invariant(['undefined', 'number'].includes(typeof line), 'options.line must be a valid number or null')
    invariant(['undefined', 'number'].includes(typeof column), 'options.column must be a valid number or null')

    this.file = file
    this.line = line
    this.column = column
    this.message = message
  }
  get stack(): string {
    let stack = `FileMessageIssue: ${this.message} at ${this.file}`
    if (this.line) {
      stack += `${this.line}:${this.column || 0}`
    }
    return stack
  }
}
