// @flow

import { parse } from 'babylon'
import { shouldProcess, registerComponent, FileIssue, FileMessageIssue } from 'pundle-api'
import type { ComponentLanguageParser } from 'pundle-api/lib/types'

import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-language-js-parser',
    version,
    hookName: 'language-parse',
    callback: (async function(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return
      }
      let ast
      try {
        ast = parse(file.contents, {
          sourceType: 'module',
          sourceFilename: file.filePath,
          plugins: ['jsx', 'flow', '*'],
        })
      } catch (error) {
        if (error.loc) {
          throw new FileIssue({
            file: file.filePath,
            contents: file.contents,
            line: error.loc.line,
            column: error.loc.column,
            message: error.message,
            severity: 'error',
          })
        } else {
          throw new FileMessageIssue({
            file: file.filePath,
            message: error.message,
          })
        }
      }
      file.parsed = {
        ast,
      }
    }: ComponentLanguageParser),
    defaultOptions: {
      extensions: ['.js'],
    },
  })
}
