// @flow

import type { Chunk, WorkerProcessResult } from './types'

export default class Job {
  locks: Set<string>
  files: Map<string, WorkerProcessResult>
  oldFiles: Map<string, WorkerProcessResult>
  chunks: Array<Chunk>

  constructor() {
    this.locks = new Set()
    this.files = new Map()
    this.oldFiles = new Map()
    this.chunks = []
  }
}
