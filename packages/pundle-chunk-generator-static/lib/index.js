// @flow

import invariant from 'assert'
import { posix as path } from 'path'
import { createChunkGenerator, getFileKey } from 'pundle-api'

import manifest from '../package.json'

function createComponent({ formats }: { formats: Array<string> }) {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-html',
    version: manifest.version,
    async callback({ chunk, job, context }) {
      const formatMatch = chunk.format === 'static' || formats.includes(chunk.format)
      if (!formatMatch || !chunk.entry) return null

      const file = job.files.get(getFileKey(chunk))
      invariant(file, 'Entry for chunk not found in generator-static')

      let { contents } = file
      const output = {
        contents: ('': any),
        sourceMap: (null: any),
        format: chunk.format,
      }
      const publicPath = context.getPublicPath(chunk)
      const sourceMapUrl = context.getPublicPath({ ...chunk, format: 'css.map' })

      if (sourceMapUrl && file.sourceMap) {
        if (chunk.format === 'css') {
          contents = `${typeof contents === 'string' ? contents : contents.toString()}\n/*# sourceMappingURL=${path.relative(
            path.dirname(publicPath),
            sourceMapUrl,
          )} */`
        }
        output.sourceMap = {
          filePath: sourceMapUrl,
          contents: JSON.stringify(file.sourceMap),
        }
      }

      output.contents = contents

      return output
    },
  })
}

module.exports = createComponent
