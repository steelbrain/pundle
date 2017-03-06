/* @flow */

import type { FileImport, FileChunk } from 'pundle-api/types'

export function serializeImport(fileImport: FileImport): string {
  return `${fileImport.from || 'null'}::${fileImport.request}::${fileImport.resolved || 'null'}`
}

export function serializeChunk(fileChunk: FileChunk): string {
  const imports = fileChunk.imports.map(serializeImport)
  const entries = fileChunk.entries.map(serializeImport)
  return JSON.stringify({ imports, entries })
}
