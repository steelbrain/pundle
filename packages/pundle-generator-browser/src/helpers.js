// @flow

import fs from 'fs'
import path from 'path'
import invariant from 'assert'
import { promisify } from 'util'
import { SourceMapConsumer } from 'source-map'
import type { Context, File, Chunk } from 'pundle-api'

const readFileAsync = promisify(fs.readFile)

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

export function getSimpleChunkMap(
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
      if (entry.type !== 'file') {
        referencedChunks.add(entry)
      }
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
  targetMap.setSourceContent(file.fileName, file.sourceContents.toString('utf8'))
}

export const wrapperHMR = require.resolve('../wrappers/hmr.built')
export const wrapperNormal = require.resolve('../wrappers/normal.built')
export async function getWrapperContents(context: Context, givenWrapper: string): Promise<string> {
  let wrapper = givenWrapper
  if (wrapper === 'normal') {
    wrapper = wrapperNormal
  } else if (wrapper === 'hmr') {
    wrapper = wrapperHMR
  } else if (wrapper === 'none') {
    return ''
  }
  if (!path.isAbsolute(wrapper)) {
    wrapper = await context.resolveSimple(wrapper)
  }
  return readFileAsync(wrapper)
}
