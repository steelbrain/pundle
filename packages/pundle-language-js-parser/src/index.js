// @flow

import { parse } from 'babylon'
import {
  shouldProcess,
  registerComponent,
  FileIssue,
  FileMessageIssue,
} from 'pundle-api'
import type { File } from 'pundle-api/types'

import { version } from '../package.json'

export default function() {
  return registerComponent({
    name: 'pundle-language-js-parser',
    version,
    hookName: 'language-parse',
    async callback(context, options, file: File) {
      if (
        !shouldProcess(context.config.rootDirectory, file.filePath, options)
      ) {
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
    },
    defaultOptions: {
      extensions: ['.js'],
    },
  })
}
