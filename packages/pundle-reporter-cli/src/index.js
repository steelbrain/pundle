// @flow

import { createIssueReporter } from '@pundle/api'
import normalizeError from '@pundle/reporter-base'

import manifest from '../package.json'

// TODO: have a config?
function createComponent() {
  return createIssueReporter({
    name: manifest.name,
    version: manifest.version,
    callback({ issue }) {
      if (process.env.PUNDLE_DEBUG === '1') {
        console.error('Issue Encountered:', issue)
      } else {
        console.log('Issue Encountered:', normalizeError(issue))
      }
    },
  })
}

module.exports = createComponent
