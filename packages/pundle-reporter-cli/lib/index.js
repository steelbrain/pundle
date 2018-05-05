// @flow

import { createIssueReporter } from 'pundle-api'
import normalizeError from 'pundle-reporter-base'

// TODO: have a config?
export default function() {
  return createIssueReporter({
    name: 'pundle-reporter-cli',
    version: '0.0.0',
    callback(issue) {
      console.log('Issue Encountered', normalizeError(issue))
    },
  })
}
