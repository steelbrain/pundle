// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getBabelCore } from './helpers'

const DEFAULT_EXCLUDE = ['node_modules/**']
export default function({
  exclude = DEFAULT_EXCLUDE,
  processOutsideProjectRoot,
}: { exclude?: Array<string | RegExp>, processOutsideProjectRoot?: boolean } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-babel',
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

      const babelCore = getBabelCore(context.config.rootDirectory)
      if (!babelCore) {
        throw new Error(`Babel not found in '${context.config.rootDirectory}' (tried @babel/core & babel-core)`)
      }

      const transformed = await new Promise((resolve, reject) => {
        babelCore.transform(
          file.contents,
          {
            root: context.config.rootDirectory,
            babelrc: true,
            filename: file.filePath,
            sourceMap: true,
            sourceType: 'module',
            highlightCode: false,
            sourceFileName: file.filePath,
          },
          function(err, result) {
            if (err) {
              reject(err)
            } else resolve(result)
          },
        )
      })

      return {
        contents: transformed.code,
        sourceMap: transformed.map,
      }
    },
  })
}
