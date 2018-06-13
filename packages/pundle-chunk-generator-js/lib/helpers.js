// @flow

import invariant from 'assert'
import { SourceMapConsumer } from 'source-map'
import { NEWLINE_REGEXP, getFileKey, type Chunk, type Job, type ImportResolved, type ImportTransformed } from 'pundle-api'

export function getLinesCount(text: string): number {
  return text.split(NEWLINE_REGEXP).length
}

export function getContentForOutput(
  chunk: Chunk,
  job: Job,
): {
  files: Array<ImportTransformed>,
} {
  const relevantFiles = new Set()

  function iterateImports(fileImport: ImportResolved, topLevelOnly: boolean) {
    const file = job.files.get(getFileKey(fileImport))
    invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

    if (relevantFiles.has(file)) return
    relevantFiles.add(file)

    if (!topLevelOnly) {
      file.imports.forEach(item => iterateImports(item, false))
    }
  }

  if (chunk.entry) {
    iterateImports(
      {
        format: chunk.format,
        filePath: chunk.entry,
      },
      !!chunk.imports.length,
    )
  }
  chunk.imports.forEach(item => iterateImports(item, true))

  return {
    files: Array.from(relevantFiles),
  }
}

export function mergeSourceMap(sourceMap: Object, targetMap: Object, offset: number, filePath: string): Promise<void> {
  return SourceMapConsumer.with(sourceMap, null, function(entryMap) {
    entryMap.eachMapping(function(mapping) {
      targetMap.addMapping({
        source: filePath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: offset + mapping.generatedLine, column: mapping.generatedColumn },
      })
    })

    const sources = (sourceMap.sources || []).filter(Boolean)
    const sourcesContent = (sourceMap.sourcesContent || []).filter(Boolean)
    if (sources.length === sourcesContent.length) {
      sources.forEach((item, index) => {
        targetMap.setSourceContent(item, sourcesContent[index])
      })
    }
  })
}
