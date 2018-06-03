// @flow

import path from 'path'
import { NEWLINE_REGEXP, createFileTransformer } from 'pundle-api'

import manifest from '../package.json'
import { getNodeSass } from './helpers'

export default function({ extensions = ['.scss'], options = {} }: { extensions?: Array<string>, options?: Object } = {}) {
  return createFileTransformer({
    name: 'pundle-transformer-sass',
    version: manifest.version,
    priority: 2000,
    async callback({ file, context }) {
      const extName = path.extname(file.filePath)
      if (!extensions.includes(extName)) return null

      const sass = getNodeSass(context.config.rootDirectory)
      if (!sass) {
        throw new Error(`'node-sass' not found in '${context.config.rootDirectory}'`)
      }

      const processed = await new Promise(function(resolve, reject) {
        sass.render(
          {
            data: typeof file.contents === 'string' ? file.contents : file.contents.toString(),
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
