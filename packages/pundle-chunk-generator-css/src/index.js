// @flow

import path from 'path'
import invariant from 'assert'
import { createChunkGenerator, getFileKey, type ComponentChunkGeneratorResult } from 'pundle-api'

import manifest from '../package.json'

function createComponent() {
  return createChunkGenerator({
    name: manifest.name,
    version: manifest.version,
    async callback({ chunk, job, context }) {
      if (chunk.format !== 'css' || !chunk.filePath) return null

      const file = job.files.get(getFileKey(chunk))
      invariant(file, 'Entry for chunk not found in generator-static')

      const { contents, sourceMap } = file

      const output: ComponentChunkGeneratorResult = {
        contents,
        sourceMap: null,
        format: chunk.format,
      }
      const publicPath = context.getPublicPath(chunk)
      const sourceMapUrl = context.getPublicPath({ ...chunk, format: 'css.map' })

      if (sourceMapUrl && sourceMap) {
        output.contents = `${
          typeof contents === 'string' ? contents : contents.toString()
        }\n/*# sourceMappingURL=${path.posix.relative(path.dirname(publicPath), sourceMapUrl)} */`
        output.sourceMap = {
          filePath: sourceMapUrl,
          contents: sourceMap,
        }
      }

      return output
    },
  })
}

module.exports = createComponent
