// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getTypescript } from './helpers'

const DEFAULT_EXCLUDE = ['node_modules/**']
export default function({
  exclude = DEFAULT_EXCLUDE,
  processOutsideProjectRoot,
}: { exclude?: Array<string | RegExp>, processOutsideProjectRoot?: boolean } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-typescript',
    version: manifest.version,
    priority: 1250,
    async callback({ file, context }) {
      if (file.format !== 'js') return null

      if (exclude.some(item => nanomatch.isMatch(file.filePath, item))) {
        // Excluded
        return null
      }
      if (!processOutsideProjectRoot && !file.filePath.startsWith(context.config.rootDirectory)) {
        // Outside project root
        return null
      }

      const typescript = getTypescript(context.config.rootDirectory)
      if (!typescript) {
        throw new Error(`Typescript not found in '${context.config.rootDirectory}'`)
      }

      const transformed = typescript.transpileModule(file.contents, {
        fileName: file.filePath,
        reportDiagnostics: true,
      })
      // TODO: Diagnostics

      return {
        contents: transformed.outputText,
        sourceMap: transformed.sourceMap ? JSON.parse(transformed.sourceMapText) : null,
      }
    },
  })
}
