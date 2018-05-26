// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getTypescripti } from './helpers'

const DEFAULT_EXCLUDE = ['node_modules/**']
export default function({
  exclude = DEFAULT_EXCLUDE,
  processOutsideProjectRoot,
}: { exclude?: Array<string | RegExp>, processOutsideProjectRoot?: boolean } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-typescript',
    version: manifest.version,
    priority: 1250,
    async callback({ contents, filePath, format }, { rootDirectory }) {
      if (format !== 'js') return null

      if (exclude.some(item => nanomatch.isMatch(filePath, item))) {
        // Excluded
        return null
      }
      if (!processOutsideProjectRoot && !filePath.startsWith(rootDirectory)) {
        // Outside project root
        return null
      }

      const typescript = getTypescripti(rootDirectory)
      if (!typescript) {
        throw new Error(`Typescript not found in '${rootDirectory}'`)
      }

      const transformed = typescript.transpileModule(contents, {
        fileName: filePath,
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
