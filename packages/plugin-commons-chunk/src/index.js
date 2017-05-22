/* @flow */

import { createChunkTransformer } from 'pundle-api'
import type { File, FileChunk, Context, ChunkTransformerResult } from 'pundle-api/types'

export default createChunkTransformer(async function(context: Context, config: Object, chunks: Array<FileChunk>): Promise<ChunkTransformerResult> {
  const known: Set<string> = new Set()
  const newChunkFiles: Map<string, File> = new Map()

  chunks.forEach(function(chunk) {
    chunk.files.forEach(function(file) {
      if (known.has(file.filePath)) {
        newChunkFiles.set(file.filePath, file)
      } else {
        known.add(file.filePath)
      }
    })
  })

  newChunkFiles.forEach(function(file: File) {
    chunks.forEach(function(chunk) {
      chunk.files.delete(file.filePath)
    })
  })

  if (!newChunkFiles.size) {
    // No common files found
    return
  }
  chunks.push(context.getChunk(null, config.name, null, newChunkFiles))
}, {
  name: 'common',
})
