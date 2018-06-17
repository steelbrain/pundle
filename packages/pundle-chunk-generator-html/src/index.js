// @flow

import invariant from 'assert'
import { createChunkGenerator, getFileKey } from 'pundle-api'

import manifest from '../package.json'
import { getChunksMatchingFilter, topologicallySortChunks } from './helpers'

const CHUNK_INJECTION_REGEXP = / *<!-- chunk-import(.*)? -->/gi

// TODO: have a config?
function createComponent() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-html',
    version: manifest.version,
    async callback({ chunk, job, context }) {
      if (chunk.format !== 'html') return null

      const { entry } = chunk
      if (!entry) return null

      function getChunkImportLine(chunkToWrite): string {
        const outputPath = context.getPublicPath(chunkToWrite)
        if (outputPath) {
          if (chunkToWrite.format === 'js') {
            return `<script src="${outputPath}" type="application/javascript"></script>`
          }
          if (chunkToWrite.format === 'css') {
            return `<link href="${outputPath}" type="text/css" rel="stylesheet">`
          }
        } else {
          // TODO: For chunks that don't want to be written, what do we do?
        }
        throw new Error(`Invalid chunk format: ${chunkToWrite.format} to include in html file '${entry}'`)
      }

      const file = job.files.get(getFileKey(chunk))
      invariant(file, 'entry file not found')

      const chunks = Array.from(job.chunks.values()).filter(
        i => i.root && i.entry !== chunk.entry && i.format !== chunk.format,
      )

      const contents = typeof file.contents === 'string' ? file.contents : file.contents.toString()

      const transformedContents = contents.replace(CHUNK_INJECTION_REGEXP, function(match, g1 = '') {
        let spacesBefore = match.indexOf('<')
        if (spacesBefore === -1) {
          spacesBefore = 0
        }
        const prefix = ' '.repeat(spacesBefore)

        const filter = g1.trim()
        const chunksToWrite = topologicallySortChunks(filter ? getChunksMatchingFilter(chunks, filter, entry) : chunks, job)

        return chunksToWrite.map(item => `${prefix}${getChunkImportLine(item)}`).join('\n')
      })

      return { format: chunk.format, contents: transformedContents }
    },
  })
}

module.exports = createComponent
