// @flow

import { parse } from 'babylon'
import { FileIssue, type Context, type File } from 'pundle-api'

export default function parseFile(context: Context, options: Object, file: File) {
  let ast
  try {
    ast = parse(file.contents, {
      sourceType: 'module',
      sourceFilename: file.filePath,
      plugins: ['jsx', 'flow', '*'],
    })
  } catch (error) {
    throw new FileIssue({
      file: file.filePath,
      contents: file.contents,
      message: error.message,
      ...(error.loc
        ? {
            line: error.loc.line,
            column: error.loc.column,
          }
        : {}),
    })
  }
  return ast
}
