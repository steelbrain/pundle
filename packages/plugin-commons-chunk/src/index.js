/* @flow */

import { createChunkTransformer } from 'pundle-api'
import type { Chunk, ChunkTransformerResult } from 'pundle-api/types'

export default createChunkTransformer(async function(config: Object, chunks: Array<Chunk>): Promise<ChunkTransformerResult> {
  console.log(chunks)
})
