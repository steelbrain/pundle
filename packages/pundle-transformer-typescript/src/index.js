// @flow

import importFrom from 'import-from'
import { createTransformer, shouldProcess, MessageIssue, FileIssue } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createTransformer({
    name: 'pundle-transformer-typescript',
    version,
    async callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      let typescript
      try {
        typescript = importFrom(context.config.rootDirectory, 'typescript')
      } catch (error) {
        if (error && error.code === 'MODULE_NOT_FOUND') {
          throw new MessageIssue(
            `pundle-resolver-typescript is to find 'typescript' in Project root. Are you sure you installed it?`,
          )
        }
        throw error
      }

      const processed = typescript.transpileModule(file.contents, {
        fileName: file.fileName,
        reportDiagnostics: true,
        ...options.config,
      })
      processed.diagnostics.forEach(diagnostic => {
        context.report(
          new FileIssue({
            file: diagnostic.file.path,
            message: diagnostic.messageText,
            ...(diagnostic.file.path === file.fileName ? { contents: file.contents } : {}),
            // TODO: Translate character offset to lines/columns
          }),
        )
      })
      if (processed.diagnostics.length) {
        throw new FileIssue({
          file: file.fileName,
          message: 'Aborting typescript transformating because of errors',
        })
      }

      return {
        contents: processed.outputText,
        sourceMap: processed.sourceMap ? JSON.parse(processed.sourceMapText) : null,
      }
    },
    defaultOptions: {
      config: {},
      extensions: ['.ts', '.tsx'],
      exclude: ['node_modules'],
    },
  })
}
