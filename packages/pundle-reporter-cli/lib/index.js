// @flow

import { createIssueReporter } from 'pundle-api'
import normalizeError from 'pundle-reporter-base'

import manifest from '../package.json'

// TODO: have a config?
export default function() {
  return createIssueReporter({
    name: 'pundle-reporter-cli',
    version: manifest.version,
    callback(issue) {
      console.log('Issue Encountered', issue, normalizeError(issue))
    },
  })
}
