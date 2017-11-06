// @flow

import type { File } from 'pundle-api'
import type { Chunk } from 'pundle-api/lib/types'

export type Job = {
  locks: Set<string>,
  chunks: Map<string, Chunk>,
  oldChunks: Map<string, Chunk>,
  files: Map<string, File>,
  oldFiles: Map<string, File>,
}
