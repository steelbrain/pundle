// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

const DEFAULT_EXCLUDE = ['node_modules/**']
const ALLOWED_VERSIONS = [6, 7]

function createComponent({
  exclude = DEFAULT_EXCLUDE,
  processOutsideProjectRoot,
  options = {},
  version,
}: {
  exclude?: Array<string | RegExp>,
  processOutsideProjectRoot?: boolean,
  options?: Object,
  version: 6 | 7,
} = {}) {
  if (!ALLOWED_VERSIONS.includes(version)) {
    throw new Error(`options.version is required to be one of: ${ALLOWED_VERSIONS.join(', ')} got: ${version}`)
  }

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

      let babelToLookFor = null
      if (version === 6) {
        babelToLookFor = 'babel-core'
      } else if (version === 7) {
        babelToLookFor = '@babel/core'
      }

      const { name, exported } = loadLocalFromContext(context, babelToLookFor ? [babelToLookFor] : [])
      if (!name) {
        throw new Error(`Babel not found in '${context.config.rootDirectory}' (tried ${babelToLookFor || ''})`)
      }

      const transformed = await new Promise((resolve, reject) => {
        const response = exported.transform(
          file.contents,
          {
            babelrc: true,
            filename: file.filePath,
            sourceMaps: true,
            sourceType: 'module',
            highlightCode: false,
            sourceFileName: file.filePath,
            ...(version === 7 ? { root: context.config.rootDirectory } : {}),
            ...options,
          },
          function(err, result) {
            if (err) {
              reject(err)
            } else resolve(result)
          },
        )

        if (version === 6) {
          resolve(response)
        }
      })

      return {
        contents: transformed.code,
        sourceMap: JSON.stringify(transformed.map),
      }
    },
  })
}

module.exports = createComponent
