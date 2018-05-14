// @flow

import { createChunkGenerator, type Job, type Chunk } from 'pundle-api'

import * as Helpers from './helpers'
import manifest from '../package.json'

// TODO: have a config?
export default function() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-js',
    version: manifest.version,
    async callback(chunk: Chunk, job: Job, { getOutputPath }) {
      if (chunk.format !== 'js') return null

      const sourceMapPath = getOutputPath({
        id: chunk.id,
        format: `${chunk.format}.map`,
      })
      const { files, chunks } = Helpers.getContentForOutput(chunk, job)

      const output = [';function(){']
      let sourceMapOffset = Helpers.getLinesCount(output[0]) + 1
      console.log('sourceMapPath', sourceMapPath)

      output.push('})();')

      return [
        {
          format: chunk.format,
          contents: output.join('\n'),
        },
      ]
    },
  })
}
