/* @flow */

import chalk from 'chalk'
import codeFrame from 'babel-code-frame'
import invariant from 'assert'
import { createReporter } from 'pundle-api'
import type { FileIssue, MessageIssue } from 'pundle-api/types'

const SEVERITIES = {
  info: {
    color: 'black',
    background: 'bgBlue',
    title: '  Info   ',
  },
  error: {
    color: 'white',
    background: 'bgRed',
    title: '  Error  ',
  },
  warning: {
    color: 'white',
    background: 'bgYellow',
    title: ' Warning ',
  },
}

export default createReporter(async function(config: Object, error: Error | FileIssue | MessageIssue) {
  invariant(typeof error === 'object' && error, 'Error must be an object')

  let errorMessage = error.message
  const severity = SEVERITIES[typeof error.severity === 'string' ? error.severity : 'error']
  const generatedType = chalk.bold[severity.background][severity.color](severity.title)
  let stack = ''
  if (error.constructor.name === 'FileIssue') {
    // TODO: Also use error.file here
    stack = codeFrame(error.contents, error.line, error.column, {
      highlightCode: chalk.supportsColor,
      linesAbove: 4,
      linesBelow: 3,
    })
  } else if (error.constructor.name === 'SyntaxError') {
    const lastLine = error.stack.split(/\n/).shift()
    errorMessage += ` in ${lastLine}`
  } else if (this.config.debug) {
    stack = error.stack
  }

  let generatedText = `${generatedType} ${errorMessage}${stack ? `\n${stack}` : ''}`
  if (!chalk.supportsColor) {
    generatedText = chalk.stripColor(generatedText)
  }
  config.log(generatedText, error)
}, {
  log: o => console.log(o),
})
