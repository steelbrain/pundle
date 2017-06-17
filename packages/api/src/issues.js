/* @flow */

import invariant from 'assert'
import { extractMessage } from './helpers'

const VALID_SEVERITIES = new Set(['info', 'warning', 'error'])

// NOTE: This function accepts lines as 1-indexed and columns as 0-indexed
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
    invariant(typeof line === 'number' && line > -1, 'Line must be a valid number')
    invariant(typeof column === 'number' && column > -1, 'Column must be a valid number')
    invariant(typeof message === 'string' && message, 'Message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'Severity must be valid')

    this.file = file
    this.line = line
    this.column = column
    this.contents = contents
    this.message = extractMessage(message)
    this.severity = severity.toLowerCase()
    this.$updateStack()
  }
  $updateStack() {
    this.stack = `FileIssue: ${this.message}\n    at ${this.file}:${this.line}:${this.column}`
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

// NOTE: This function accepts lines as 1-indexed and columns as 0-indexed
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
    this.message = extractMessage(message)

    this.$updateStack()
  }
  $updateStack() {
    this.stack = `FileMessageIssue: ${this.message} at ${this.file}`
    if (this.line) {
      this.stack += `${this.line}:${this.column || 0}`
    }
  }
}
