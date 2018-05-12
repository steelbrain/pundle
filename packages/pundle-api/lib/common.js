// @flow

import Imurmurhash from 'imurmurhash'
import type { Chunk } from './types'

export function getChunkHash(identifier: string): string {
  const hash = new Imurmurhash()
    .hash(identifier)
    .result()
    .toString()
  return `c${hash}`
}
export function getFileImportHash(filePath: string): string {
  const hash = new Imurmurhash()
    .hash(filePath)
    .result()
    .toString()
  return `p${hash}`
}

export function getChunk(format: string, label: ?string = null, entry: ?string = null): Chunk {
  let id
  if (label) {
    id = getChunkHash(label)
  } else if (entry) {
    id = getChunkHash(entry)
  } else {
    throw new Error('Either label or entry are required to make a chunk')
  }
  return {
    id,
    format,
    entry,
    label,
    imports: [],
  }
}
