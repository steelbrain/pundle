/* @flow */

import invariant from 'assert'

const VALID_SEVERITIES = new Set(['info', 'warning', 'error'])

// NOTE: This function accepts both lines and columns as 1-indexed
// Babel by default has locs with 0-indexed columns, you'll have to
// +1 them before feeding to this Class
export class FileIssue {
  line: number;
  column: number;
  contents: string;
  message: string;
  severity: string;

  constructor(contents: string, line: number, column: number, message: string, severity: string = 'error') {
    this.contents = contents
    this.line = line
    this.column = column
    this.message = message
    this.severity = severity.toLowerCase()

    invariant(typeof this.contents === 'string' && this.contents, 'Contents must be a valid string')
    invariant(typeof this.line === 'number' && this.line, 'Line must be a valid number')
    invariant(typeof this.column === 'number' && this.column, 'Column must be a valid number')
    invariant(typeof this.message === 'string' && this.message, 'Message must be a valid string')
    invariant(VALID_SEVERITIES.has(this.severity), 'Severity must be valid')
  }
}

export class MessageIssue {
  message: string;
  severity: string;
  constructor(message: string, severity: string = 'error') {
    this.message = message
    this.severity = severity
    invariant(typeof this.message === 'string' && this.message, 'Message must be a valid string')
    invariant(VALID_SEVERITIES.has(this.severity), 'Severity must be valid')
  }
}
