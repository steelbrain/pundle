// @flow

import invariant from 'assert'
import { SourceMapConsumer } from 'source-map'
import type { File, Chunk } from 'pundle-api'

export const LINE_BREAK = /\r\n|\n|\r/
export function getLinesCount(givenText: string | Array<string>): number {
  let text
  if (Array.isArray(givenText)) {
    text = givenText.join('\n')
  } else {
    text = givenText
  }
  return text.split(LINE_BREAK).length
}

export function getChunkMap(
  chunk: Chunk,
  files: Map<string, File>,
): {|
  files: Map<string, File>,
  chunks: Set<Chunk>,
|} {
  const relevantFiles = new Map()
  const referencedChunks = new Set()

  function iterateImports(fileName: string) {
    const file = files.get(fileName)
    invariant(file, 'File referenced in chunk not found in local cache!?')
    if (relevantFiles.has(fileName)) return
    relevantFiles.set(fileName, file)
    file.imports.forEach(iterateImports)
    file.chunks.forEach(function(entry) {
      referencedChunks.add(entry)
    })
  }
  if (chunk.entry) {
    iterateImports(chunk.entry)
  }
  chunk.imports.forEach(iterateImports)

  return {
    files: relevantFiles,
    chunks: referencedChunks,
  }
}

export function mergeSourceMap(sourceMap: Object, targetMap: Object, file: File, offset: number): void {
  const entryMap = new SourceMapConsumer(sourceMap)
  // eslint-disable-next-line no-underscore-dangle
  entryMap._generatedMappings.forEach(function(mapping) {
    targetMap.addMapping({
      source: file.fileName,
      original: { line: mapping.originalLine, column: mapping.originalColumn },
      generated: { line: offset + mapping.generatedLine, column: mapping.generatedColumn },
    })
  })
  targetMap.setSourceContent(file.fileName, file.contents)
}
