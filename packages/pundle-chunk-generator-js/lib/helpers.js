// @flow

import invariant from 'assert'
import { NEWLINE_REGEXP, getFileKey, type Chunk, type Job, type ImportResolved, type ImportTransformed } from 'pundle-api'

export function getLinesCount(text: string): number {
  return text.split(NEWLINE_REGEXP).filter(Boolean).length
}

export function getContentForOutput(
  chunk: Chunk,
  job: Job,
): {
  files: Array<ImportTransformed>,
  chunks: Array<Chunk>,
} {
  const relevantFiles = new Set()
  const relevantChunks = new Set()

  function iterateImports(fileImport: ImportResolved) {
    const file = job.files.get(getFileKey(fileImport))
    invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

    if (relevantFiles.has(file)) return
    relevantFiles.add(file)

    file.imports.forEach(iterateImports)
    file.chunks.forEach(function(relevantChunk) {
      if (relevantChunk.format !== fileImport.format) {
        // Do not include chunks of other formats
        return
      }
      relevantChunks.add(relevantChunk)
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
    files: Array.from(relevantFiles),
    chunks: Array.from(relevantChunks),
  }
}
