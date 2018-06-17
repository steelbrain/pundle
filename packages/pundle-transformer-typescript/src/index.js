// @flow
import path from 'path'
import nanomatch from 'nanomatch'
import { PundleError, characterOffsetToLoc, createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

const DEFAULT_EXCLUDE = ['node_modules/**']
const DEFAULT_EXTENSIONS = ['.ts', '.tsx']

function createComponent({
  exclude = DEFAULT_EXCLUDE,
  extensions = DEFAULT_EXTENSIONS,
  processOutsideProjectRoot,
}: { exclude?: Array<string | RegExp>, extensions: Array<string>, processOutsideProjectRoot?: boolean } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-typescript',
    version: manifest.version,
    priority: 1500,
    async callback({ file, context }) {
      if (file.format !== 'js') return null
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      if (exclude.some(item => nanomatch.isMatch(file.filePath, item))) {
        // Excluded
        return null
      }
      if (!processOutsideProjectRoot && !file.filePath.startsWith(context.config.rootDirectory)) {
        // Outside project root
        return null
      }

      const { name, exported } = loadLocalFromContext(context, ['typescript'])
      if (!name) {
        throw new Error(`'typescript' not found in '${context.config.rootDirectory}'`)
      }

      const transformed = exported.transpileModule(
        typeof file.contents === 'string' ? file.contents : file.contents.toString(),
        {
          fileName: file.filePath,
          reportDiagnostics: true,
        },
      )
      const issue = transformed.diagnostics[0]
      if (issue) {
        throw new PundleError(
          'WORK',
          'TRANSFORM_FAILED',
          issue.messageText,
          issue.file.path,
          characterOffsetToLoc(issue.file.text, issue.start),
        )
      }

      return {
        contents: transformed.outputText,
        sourceMap: transformed.sourceMap ? JSON.parse(transformed.sourceMapText) : null,
      }
    },
  })
}

module.exports = createComponent
