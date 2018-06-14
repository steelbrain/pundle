// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer, loadLocalFromContext } from 'pundle-api'

import manifest from '../package.json'

const DEFAULT_EXCLUDE = ['node_modules/**']
function createComponent({
  exclude = DEFAULT_EXCLUDE,
  processOutsideProjectRoot,
  options = {},
  version = 'both',
}: {
  exclude?: Array<string | RegExp>,
  processOutsideProjectRoot?: boolean,
  options?: Object,
  version: 'both' | '6' | '7',
} = {}) {
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

      const babelsToLookFor = []
      if (version === 'both') {
        babelsToLookFor.push('@babel/core', 'babel-core')
      } else if (version === '7') {
        babelsToLookFor.push('@babel/core')
      } else {
        babelsToLookFor.push('babel-core')
      }
      const { name, exported } = loadLocalFromContext(context, babelsToLookFor)
      if (!name) {
        throw new Error(`Babel not found in '${context.config.rootDirectory}' (tried @babel/core & babel-core)`)
      }

      const transformed = await new Promise((resolve, reject) => {
        exported.transform(
          file.contents,
          {
            babelrc: true,
            filename: file.filePath,
            sourceMaps: true,
            sourceType: 'module',
            highlightCode: false,
            sourceFileName: file.filePath,
            ...(name === '@babel/core' ? { root: context.config.rootDirectory } : {}),
            ...options,
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

module.exports = createComponent
