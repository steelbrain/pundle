// @flow

import invariant from 'assert'
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
      const outputs = []
      const sourceMapUrl = context.getPublicPath({ ...chunk, format: 'css.map' })

      if (sourceMapUrl && file.sourceMap) {
        if (chunk.format === 'css') {
          contents = `${
            typeof contents === 'string' ? contents : contents.toString()
          }\n/*# sourceMappingURL=${sourceMapUrl} */`
        }
        outputs.push({ contents: JSON.stringify(file.sourceMap), format: `${chunk.format}.map` })
      }

      outputs.push({
        format: chunk.format,
        contents,
      })

      return outputs
    },
  })
}

module.exports = createComponent
