// @flow

import Imurmurhash from 'imurmurhash'
import type { Chunk } from './types'

export function getChunkHash(identifier: string, format: string): string {
  const hash = new Imurmurhash()
    .hash(identifier)
    .result()
    .toString()
  return `c${format}${hash}`
}
export function getFileImportHash(filePath: string, format: string): string {
  const hash = new Imurmurhash()
    .hash(filePath)
    .result()
    .toString()
  return `p${format}${hash}`
}

export function getChunk(format: string, label: ?string = null, entry: ?string = null): Chunk {
  let id
  if (label) {
    id = getChunkHash(label, format)
  } else if (entry) {
    id = getChunkHash(entry, format)
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
