/* @flow */

import chalk from 'chalk'
import codeFrame from 'babel-code-frame'
import invariant from 'assert'
import { createReporter } from 'pundle-api'
import type { FileError, MessageError } from 'pundle-api/types'

const SEVERITY_COLOR_MAP = {
  info: 'bgBlue',
  error: 'bgRed',
  warning: 'bgYellow',
}
const SEVERITY_TYPE_MAP = {
  info: 'Info',
  error: 'Error',
  warning: 'Warning',
}

export default createReporter(async function(config: Object, error: Error | FileError | MessageError) {
  invariant(typeof error === 'object' && error, 'Error must be an object')

  const severity = typeof error.severity === 'string' ? error.severity : 'error'
  const errorMessage = error.message
  const generatedType = chalk.bold[SEVERITY_COLOR_MAP[severity]](` ${SEVERITY_TYPE_MAP[severity]} `)
  let stack = ''
  if (error.constructor.name === 'FileError') {
    stack = codeFrame(error.contents, error.line, error.column, {
      highlightCode: chalk.supportsColor,
      linesAbove: 4,
      linesBelow: 3,
    })
  }

  let generatedText = `${generatedType} ${errorMessage}${stack ? `\n${stack}` : ''}`
  if (!chalk.supportsColor) {
    generatedText = chalk.stripColor(generatedText)
  }
  console.log(generatedText)
})
