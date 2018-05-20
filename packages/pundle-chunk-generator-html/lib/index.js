// @flow

import globrex from 'globrex'
import { createChunkGenerator, getFileImportHash, type Job, type Chunk } from 'pundle-api'

import manifest from '../package.json'

const CHUNK_INJECTION_REGEXP = / *<!-- chunk-import(.*)? -->/gi

const chunkMatchingCache = {}
function getChunksMatchingFilter(chunks: Array<Chunk>, filter: string, entry: string): Array<Chunk> {
  const [key, value] = filter.split(':')
  if (!key || !value) {
    throw new Error(`Invalid chunks filter: '${filter}' in HTML file '${entry}'`)
  }

  let regex = chunkMatchingCache[value]
  if (!regex) {
    const result = globrex(value)
    regex = result.regex // eslint-disable-line prefer-destructuring
    chunkMatchingCache[value] = result.regex
  }

  return chunks.filter(chunk => regex.test(chunk[key]))
}

// TODO: have a config?
export default function() {
  return createChunkGenerator({
    name: 'pundle-chunk-generator-html',
    version: manifest.version,
    async callback(chunk: Chunk, job: Job, { getOutputPath }) {
      if (chunk.format !== 'html') return null

      const { entry } = chunk
      if (!entry) return null

      function getChunkImportLine(chunkToWrite): string {
        const outputPath = getOutputPath(chunkToWrite)
        if (chunkToWrite.format === 'js') {
          return `<script src="${outputPath}" type="application/javascript"></script>`
        }
        if (chunkToWrite.format === 'css') {
          return `<link href="${outputPath}" type="text/css" rel="stylesheet">`
        }
        throw new Error(`Invalid chunk format: ${chunkToWrite.format} to include in html file '${entry}'`)
      }

      const file = job.files.get(getFileImportHash(entry, chunk.format))
      const chunks = Array.from(job.chunks.values()).filter(i => i.entry !== chunk.entry && i.format !== chunk.format)
      const contents = file.isBuffer ? file.contents.toString() : file.contents

      const transformedContents = contents.replace(CHUNK_INJECTION_REGEXP, function(match, g1 = '') {
        let spacesBefore = match.indexOf('<')
        if (spacesBefore === -1) {
          spacesBefore = 0
        }
        const prefix = ' '.repeat(spacesBefore)

        const filter = g1.trim()
        const chunksToWrite = filter ? getChunksMatchingFilter(chunks, filter, entry) : chunks
        return chunksToWrite.map(getChunkImportLine).map(line => `${prefix}${line}`)
      })

      return [{ format: chunk.format, contents: transformedContents }]
    },
  })
}
