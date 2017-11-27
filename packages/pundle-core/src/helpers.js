// @flow

import { type Chunk } from 'pundle-api'

// eslint-disable-next-line import/prefer-default-export
export function getChunkFilePath(chunk: Chunk, template: string): string {
  return template
    .replace('[label]', chunk.label)
    .replace('[format]', chunk.format)
    .replace('[type]', chunk.type)
}
