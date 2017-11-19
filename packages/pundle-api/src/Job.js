// @flow

import type File from './File'
import type { Chunk } from './types'

export default class Job {
  locks: Set<string>
  chunks: Array<Chunk>
  files: Map<string, File>
  oldFiles: Map<string, File>

  constructor() {
    this.locks = new Set()
    this.chunks = []
    this.files = new Map()

    // TODO: Restore this?
    this.oldFiles = new Map()
  }
  deleteChunk(chunk: Chunk): void {
    const index = this.chunks.indexOf(chunk)
    if (index !== -1) {
      this.chunks.splice(index, 1)
    }
  }
  upsertChunk(chunk: Chunk): void {
    const lockKey = this.getLockKeyForChunk(chunk)
    const oldIndex = this.chunks.findIndex(entry => this.getLockKeyForChunk(entry) === lockKey)
    if (oldIndex !== -1) {
      this.chunks.splice(oldIndex, 1, chunk)
    } else {
      this.chunks.push(chunk)
    }
  }
  getSimilarChunk(chunk: Chunk): ?Chunk {
    const lockKey = this.getLockKeyForChunk(chunk)
    return this.chunks.find(entry => this.getLockKeyForChunk(entry) === lockKey)
  }
  getLockKeyForChunk(chunk: Chunk): string {
    return `chunk:${chunk.entry || ''}:${chunk.imports.join(':')}:${chunk.type}:${chunk.format}`
  }
  getLockKeyForFile(file: string): string {
    return `file:${file}`
  }
}
