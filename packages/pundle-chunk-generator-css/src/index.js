// @flow

import path from 'path'
import invariant from 'assert'
import { createChunkGenerator, getFileKey } from 'pundle-api'

import manifest from '../package.json'

function createComponent() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-static',
    version: manifest.version,
    async callback({ chunk, job, context }) {
      if (chunk.format !== 'css' || !chunk.entry) return null

      const file = job.files.get(getFileKey(chunk))
      invariant(file, 'Entry for chunk not found in generator-static')

      let { contents } = file
      const output: {
        contents: string,
        sourceMap: ?string,
        format: string,
      } = {
        contents: '',
        sourceMap: null,
        format: chunk.format,
      }
      const publicPath = context.getPublicPath(chunk)
      const sourceMapUrl = context.getPublicPath({ ...chunk, format: 'css.map' })

      if (sourceMapUrl && file.sourceMap) {
        contents = `${
          typeof contents === 'string' ? contents : contents.toString()
        }\n/*# sourceMappingURL=${path.posix.relative(path.dirname(publicPath), sourceMapUrl)} */`
        output.sourceMap = {
          filePath: sourceMapUrl,
          contents: file.sourceMap,
        }
      }

      output.contents = contents

      return output
    },
  })
}

module.exports = createComponent
