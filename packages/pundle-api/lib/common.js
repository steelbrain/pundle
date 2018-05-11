// @flow

import Imurmurhash from 'imurmurhash'
import type { Chunk } from './types'

export function getChunk(format: string, label: ?string = null, entry: ?string = null): Chunk {
  if (!label && !entry) {
    throw new Error('Either label or entry are required to make a chunk')
  }
  const labelToUse: string =
    label ||
    new Imurmurhash()
      .hash(entry)
      .result()
      .toString()
  return {
    format,
    entry,
    label: labelToUse,
    imports: [],
  }
}
