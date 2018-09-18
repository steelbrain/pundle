// @flow

import path from 'path'
import { NEWLINE_REGEXP, createFileTransformer, loadLocalFromContext } from '@pundle/api'

import manifest from '../package.json'

function createComponent({
  extensions = ['.scss', '.sass'],
  options = {},
}: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: manifest.name,
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const exported = await loadLocalFromContext(context, 'node-sass')
      const processed = await new Promise(function(resolve, reject) {
        exported.render(
          {
            data: typeof file.contents === 'string' ? file.contents : file.contents.toString(),
            includePaths: [path.dirname(file.filePath)],
            outFile: '/dev/null',
            sourceMap: true,
            ...options,
          },
          function(error, result) {
            if (error) {
              reject(error)
            } else resolve(result)
          },
        )
      })

      const css = processed.css
        .toString()
        .split(NEWLINE_REGEXP)
        .slice(0, -1)
        .join('\n')

      return {
        contents: css,
        sourceMap: JSON.parse(processed.map),
      }
    },
  })
}

module.exports = createComponent
