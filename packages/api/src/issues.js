/* @flow */

import invariant from 'assert'

const VALID_SEVERITIES = new Set(['info', 'warning', 'error'])

// NOTE: This function accepts both lines and columns as 1-indexed
// Babel by default has locs with 0-indexed columns, you'll have to
// +1 them before feeding to this Class
export class FileIssue {
  file: string;
  line: number;
  column: number;
  contents: string;
  message: string;
  severity: string;

  // For compatibility with Error object
  stack: string;

  constructor(file: string, contents: string, line: number, column: number, message: string, severity: string = 'error') {
    invariant(typeof file === 'string' && file, 'File must be a valid string')
    invariant(typeof contents === 'string' && contents, 'Contents must be a valid string')
    invariant(typeof line === 'number' && line, 'Line must be a valid number')
    invariant(typeof column === 'number' && column, 'Column must be a valid number')
    invariant(typeof message === 'string' && message, 'Message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'Severity must be valid')

    this.file = file
    this.line = line
    this.column = column
    this.contents = contents
    this.message = message
    this.severity = severity.toLowerCase()
    this.stack = `FileIssue: ${message}\n    at ${file}:${line}:${column}`
  }
}

export class MessageIssue {
  message: string;
  severity: string;

  // For compatibility with Error object
  stack: string;
  constructor(message: string, severity: string = 'error') {
    invariant(typeof message === 'string' && message, 'Message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'Severity must be valid')

    this.message = message
    this.severity = severity
    this.stack = `MessageIssue: ${severity.toUpperCase()}: ${message}`
  }
}

export class FileMessageIssue {
  file: string;
  line: ?number;
  column: ?number;
  message: string;

  // For compatibility with Error object
  stack: string;
  constructor(file: string, message: string, line: ?number = null, column: ?number = null) {
    invariant(typeof file === 'string' && file, 'File must be a valid string')
    invariant(typeof message === 'string' && message, 'Message must be a valid string')
    invariant(typeof line === 'number' || line === null, 'Line must be a valid number or null')
    invariant(typeof column === 'number' || column === null, 'Column must be a valid number or null')

    this.file = file
    this.line = line
    this.column = column
    this.message = message

    this.stack = `FileMessageIssue: ${message} at ${file}`
    if (line !== null) {
      this.stack += `${line}:${column || 0}`
    }
  }
}
