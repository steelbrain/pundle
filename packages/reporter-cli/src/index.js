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

  const severity = SEVERITIES[typeof error.severity === 'string' ? error.severity : 'error']
  const errorMessage = error.message
  const generatedType = chalk.bold[severity.background][severity.color](severity.title)
  let stack = ''
  if (error.constructor.name === 'FileIssue') {
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
  config.log(generatedText)
}, {
  log: o => console.log(o),
})
