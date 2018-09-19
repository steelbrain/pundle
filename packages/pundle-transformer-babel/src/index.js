// @flow

import nanomatch from 'nanomatch'
import { createFileTransformer, loadLocalFromContext } from '@pundle/api'

import manifest from '../package.json'

const ALLOWED_VERSIONS = [6, 7]

function createComponent({
  exclude: givenExclude,
  ignoreInNodeModules = true,
  ignoreOutsideProjectRoot = true,
  options = {},
  version,
}: {
  exclude?: Array<string | RegExp>,
  ignoreInNodeModules?: boolean,
  ignoreOutsideProjectRoot?: boolean,
  options?: Object,
  version: 6 | 7,
} = {}) {
  if (!ALLOWED_VERSIONS.includes(version)) {
    throw new Error(`options.version is required to be one of: ${ALLOWED_VERSIONS.join(', ')} got: ${version}`)
  }

  const exclude = Array.from(givenExclude || []).filter(Boolean)
  if (ignoreInNodeModules) {
    exclude.push(/node_modules/)
  }

  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 1250,
    async callback({ file, context }) {
      if (file.format !== 'js') return null

      if (exclude.some(item => nanomatch.isMatch(file.filePath, item))) {
        // Excluded
        return null
      }
      if (ignoreOutsideProjectRoot && !file.filePath.startsWith(context.config.rootDirectory)) {
        // Outside project root
        return null
      }

      let babelToLookFor
      if (version === 6) {
        babelToLookFor = 'babel-core'
      } else if (version === 7) {
        babelToLookFor = '@babel/core'
      } else {
        throw new Error('Unknown babel version in config encountered')
      }

      const exported = await loadLocalFromContext(context, babelToLookFor)
      const transformed = await new Promise((resolve, reject) => {
        const response = exported.transform(
          typeof file.contents === 'string' ? file.contents : file.contents.toString(),
          {
            babelrc: true,
            filename: file.filePath,
            sourceMaps: true,
            sourceType: version === 7 ? 'unambiguous' : 'module',
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
        sourceMap: transformed.map,
      }
    },
  })
}

module.exports = createComponent
