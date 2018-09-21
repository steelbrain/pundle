// @flow

import invariant from 'assert'
import { SourceMapConsumer } from 'source-map'
import { NEWLINE_REGEXP, getFileKey, type Chunk, type Job, type ImportResolved, type ImportTransformed } from '@pundle/api'

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

  function iterateImports(fileImport: ImportResolved) {
    const file = job.files.get(getFileKey(fileImport))
    invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

    if (relevantFiles.has(file)) return
    relevantFiles.add(file)

    if (!chunk.flat) {
      file.imports.forEach(item => iterateImports(item))
    }
  }

  if (chunk.filePath) {
    iterateImports({
      meta: chunk.meta,
      format: chunk.format,
      filePath: chunk.filePath,
    })
  }
  chunk.imports.forEach(item => iterateImports(item))

  return {
    files: Array.from(relevantFiles),
  }
}

export function mergeSourceMap(sourceMap: string, targetMap: Object, offset: number, filePath: string): Promise<void> {
  const parsedSourceMap = JSON.parse(sourceMap)

  return SourceMapConsumer.with(parsedSourceMap, null, function(entryMap) {
    entryMap.eachMapping(function(mapping) {
      targetMap.addMapping({
        source: filePath,
        original: { line: mapping.originalLine, column: mapping.originalColumn },
        generated: { line: offset + mapping.generatedLine, column: mapping.generatedColumn },
      })
    })

    const sources = (parsedSourceMap.sources || []).filter(Boolean)
    const sourcesContent = (parsedSourceMap.sourcesContent || []).filter(Boolean)
    if (sources.length === sourcesContent.length) {
      sources.forEach((item, index) => {
        targetMap.setSourceContent(item, sourcesContent[index])
      })
    }
  })
}
