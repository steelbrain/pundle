// @flow

import invariant from 'assert'

// NOTE: This class accepts lines as 1-indexed and columns as 0-indexed
export default class FileMessageIssue {
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
