/* @flow */

import { createChunkTransformer } from 'pundle-api'
import type { File, FileChunk, ChunkTransformerResult } from 'pundle-api/types'

export default createChunkTransformer(function(config: Object, chunks: Array<FileChunk>): ChunkTransformerResult {
  const known: Set<string> = new Set()
  const newChunkFiles: Map<string, File> = new Map()
  const newChunkChildren: Set<FileChunk> = new Set()

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
      if (chunk.files.has(file.filePath)) {
        chunk.files.delete(file.filePath)
        newChunkChildren.add(chunk)
      }
    })
  })

  if (!newChunkFiles.size) {
    // No common chunks found
    return
  }
  const newChunk = this.getChunk(null, null, newChunkFiles, null)
  newChunkChildren.forEach(function(chunk) {
    chunk.parents.push(newChunk)
  })
  chunks.push(newChunk)
})
