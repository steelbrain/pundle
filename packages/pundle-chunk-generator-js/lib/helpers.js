// @flow

import invariant from 'assert'
import { getFileImportHash, type Chunk, type Job, type ImportResolved, type WorkerProcessResult } from 'pundle-api'

export const REGEX_NEWLINE = /(\r?\n)/g

export function getLinesCount(text: string): number {
  return text.split(REGEX_NEWLINE).filter(Boolean).length
}

export function getContentForOutput(
  chunk: Chunk,
  job: Job,
): {
  files: Array<WorkerProcessResult>,
  chunks: Array<Chunk>,
} {
  const relevantFiles = new Map()
  const relevantChunks = new Map()

  function iterateImports(fileImport: ImportResolved) {
    const fileKey = getFileImportHash(fileImport.filePath, fileImport.format)
    const file = job.files.get(fileKey)
    invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

    if (relevantFiles.has(fileKey)) return
    relevantFiles.set(fileKey, file)

    file.imports.forEach(iterateImports)
    file.chunks.forEach(function(relevantChunk) {
      relevantChunks.set(relevantChunk.id, relevantChunk)
    })
  }

  if (chunk.entry) {
    iterateImports({
      format: chunk.format,
      filePath: chunk.entry,
    })
  }
  chunk.imports.forEach(iterateImports)

  return {
    files: Array.from(relevantFiles.values()),
    chunks: Array.from(relevantChunks.values()),
  }
}
