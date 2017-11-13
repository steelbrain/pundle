// @flow

import importFrom from 'import-from'
import { createTransformer, shouldProcess, MessageIssue, FileIssue } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createTransformer({
    name: 'pundle-transformer-babel',
    version,
    async callback(context, options, file) {
      if (!shouldProcess(context.config.rootDirectory, file.filePath, options)) {
        return null
      }
      let babelCore
      try {
        babelCore = importFrom(context.config.rootDirectory, 'babel-core')
      } catch (error) {
        if (error && error.code === 'MODULE_NOT_FOUND') {
          throw new MessageIssue(
            `pundle-resolver-babel is to find 'babel-core' in Project root. Are you sure you installed it?`,
          )
        }
        throw error
      }

      const mergedConfigs = {
        babelrc: false,
        filename: file.filePath,
        sourceMap: true,
        highlightCode: false,
        sourceFileName: file.filePath,
      }
      if (file.filePath.startsWith(context.config.rootDirectory)) {
        Object.assign(mergedConfigs, {
          babelrc: true,
          ...options.config,
        })
      }

      let processed
      try {
        processed = babelCore.transform(file.contents, mergedConfigs)
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

      return {
        contents: processed.code,
        sourceMap: processed.map,
      }
    },
    defaultOptions: {
      config: {},
      extensions: ['.js'],
      exclude: ['node_modules'],
    },
  })
}
