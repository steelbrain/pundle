// @flow

import type { File } from 'pundle-api'
import type { Chunk } from 'pundle-api/lib/types'

export default class Job {
  locks: Set<string>
  chunks: Map<string, Chunk>
  oldChunks: Map<string, Chunk>
  files: Map<string, File>
  oldFiles: Map<string, File>

  constructor() {
    this.locks = new Set()
    this.chunks = new Map()
    this.files = new Map()

    // TODO: Restore these?
    this.oldChunks = new Map()
    this.oldFiles = new Map()
  }
  getLockKeyForChunk(chunk: Chunk): string {
    return `chunk:${chunk.entry || ''}:${chunk.imports.join(':')}`
  }
  getLockKeyForFile(file: string): string {
    return `file:${file}`
  }
}
