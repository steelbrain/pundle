// @flow

import invariant from 'assert'
import { createChunkGenerator, getFileKey } from 'pundle-api'

import manifest from '../package.json'

function createComponent() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-static',
    version: manifest.version,
    async callback({ chunk, job }) {
      if (chunk.format !== 'static' || !chunk.entry) return null

      const file = job.files.get(getFileKey(chunk))
      invariant(file, 'Entry for chunk not found in generator-static')

      return {
        format: chunk.format,
        sourceMap: null,
        contents: file.contents,
      }
    },
  })
}

module.exports = createComponent
