// @flow

import type { Chunk, ImportTransformed } from './types'

export default class Job {
  locks: Set<string>
  files: Map<string, ImportTransformed>
  oldFiles: Map<string, ImportTransformed>
  chunks: Map<string, Chunk>

  constructor() {
    this.locks = new Set()
    this.files = new Map()
    this.oldFiles = new Map()
    this.chunks = new Map()
  }
  clone() {
    const cloned = new Job()
    cloned.files = new Map(this.files)
    cloned.chunks = new Map(this.chunks)
    return cloned
  }
}
