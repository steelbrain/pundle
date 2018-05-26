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
    priority: 999,
    // -1 from transformer-js
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

      const babelCore = getBabelCore(rootDirectory)
      if (!babelCore) {
        throw new Error(`Babel not found in '${rootDirectory}' (tried @babel/core & babel-core)`)
      }

      const transformed = await new Promise((resolve, reject) => {
        babelCore.transform(
          contents,
          {
            babelrc: true,
            filename: filePath,
            sourceMap: true,
            highlightCode: false,
            sourceFileName: filePath,
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
