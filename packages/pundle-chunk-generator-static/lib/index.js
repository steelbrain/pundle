// @flow

import invariant from 'assert'
import { createChunkGenerator, getFileImportHash } from 'pundle-api'

import manifest from '../package.json'

export default function({ formats }: { formats: Array<string> }) {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-html',
    version: manifest.version,
    async callback({ chunk, job }) {
      const formatMatch = chunk.format === 'static' || formats.includes(chunk.format)
      if (!formatMatch || !chunk.entry) return null

      const file = job.files.get(getFileImportHash(chunk))
      invariant(file, 'Entry for chunk not found in generator-static')

      const outputs = [
        {
          format: chunk.format,
          contents: file.contents,
        },
      ]
      if (file.sourceMap) {
        outputs.push({ contents: JSON.stringify(file.sourceMap), format: `${chunk.format}.map` })
      }

      return outputs
    },
  })
}
