// @flow

import { createLoader, shouldProcess, MessageIssue } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createLoader({
    name: 'pundle-loader-json',
    version,
    callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      let parsed
      try {
        parsed = JSON.parse(file.contents)
      } catch (_) {
        throw new MessageIssue(`Malformed JSON found at '${file.filePath}'`, 'error')
      }

      return {
        sourceMap: {
          version: 3,
          sources: [file.filePath],
          names: ['$'],
          mappings: 'AAAAA',
        },
        contents: `module.exports = ${JSON.stringify(parsed)}`,
      }
    },
    defaultOptions: {
      extensions: ['.json'],
    },
  })
}
