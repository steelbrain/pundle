// @flow

import invariant from 'assert'
import { VALID_SEVERITIES } from '../common'
import type { Severity } from '../types'

export default class MessageIssue {
  message: string
  severity: string

  // For compatibility with Error object
  stack: string
  constructor(message: string, severity: Severity = 'error') {
    invariant(typeof message === 'string' && message, 'options.message must be a valid string')
    invariant(VALID_SEVERITIES.has(severity), 'options.severity must be valid')

    this.message = message
    this.severity = severity
  }
  get stack(): string {
    return `MessageIssue: ${this.severity.toUpperCase()}: ${this.message}`
  }
}
