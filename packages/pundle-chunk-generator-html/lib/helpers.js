// @flow

import globrex from 'globrex'
import invariant from 'assert'
import toposort from 'toposort'
import { getFileKey, getChunkKey, type Job, type Chunk, type ImportResolved } from 'pundle-api'

export function topologicallySortChunks(chunks: Array<Chunk>, job: Job): Array<Chunk> {
  const graph = []
  const processedFiles = new Set()

  function iterateImports(fileImport: ImportResolved, chunkHash: string) {
    const file = job.files.get(getFileKey(fileImport))
    invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

    if (processedFiles.has(file)) return
    processedFiles.add(file)

    file.imports.forEach(item => iterateImports(item, chunkHash))
    file.chunks.forEach(function(relevantChunk) {
      graph.push([chunkHash, getChunkKey(relevantChunk)])
    })
  }

  const chunksMap = {}
  chunks.forEach(chunk => {
    const chunkHash = getChunkKey(chunk)
    // NOTE: Fix for when an item is not required or requires anything else
    graph.push([chunkHash, null])
    chunksMap[chunkHash] = chunk
    if (chunk.entry) {
      iterateImports(
        {
          format: chunk.format,
          filePath: chunk.entry,
        },
        chunkHash,
      )
    }
    chunk.imports.forEach(item => iterateImports(item, chunkHash))
  })

  const sorted = toposort(graph).reverse()
  return sorted.map(item => chunksMap[item]).filter(Boolean)
}

const chunkMatchingCache = {}
export function getChunksMatchingFilter(chunks: Array<Chunk>, filter: string, entry: string): Array<Chunk> {
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
