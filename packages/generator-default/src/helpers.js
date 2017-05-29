/* @flow */

import Path from 'path'
import slash from 'slash'
import fileSystem from 'sb-fs'
import { SourceMapConsumer } from 'source-map'
import type { Context, FileChunk } from 'pundle-api/types'

export const LINE_BREAK = /\r\n|\n|\r/
export function getLinesCount(text: string): number {
  return text.split(LINE_BREAK).length
}

// TODO: Maybe move this function on context?
// TODO: Persist these numeric paths when resuming from cache
let nextNumericPath = 1
export const numericPaths: Map<string, string> = new Map()
export function getFilePath(context: Context, config: Object, filePath: string): string {
  let toReturn
  if (config.pathType === 'filePath') {
    toReturn = Path.join(`$${config.sourceNamespace}`, Path.relative(context.config.rootDirectory, filePath))
  } else {
    toReturn = numericPaths.get(filePath)
    if (!toReturn) {
      nextNumericPath++
      numericPaths.set(filePath, toReturn = `m-${nextNumericPath}`)
    }
  }
  return slash(toReturn)
}

export const wrapperHMR = require.resolve('../wrappers/dist/hmr')
export const wrapperNormal = require.resolve('../wrappers/dist/normal')
export async function getWrapperContents(context: Context, config: Object): Promise<string> {
  let wrapper = config.wrapper
  if (wrapper === 'normal') {
    wrapper = wrapperNormal
  } else if (wrapper === 'hmr') {
    wrapper = wrapperHMR
  } else if (wrapper === 'none') {
    return ''
  }
  if (!Path.isAbsolute(wrapper)) {
    wrapper = await context.resolve(wrapper, null, false)
  }
  let fileContents = await fileSystem.readFile(wrapper)

  if (config.publicRoot && config.bundlePath) {
    const outputPath = Path.join(config.publicRoot, Path.basename(config.bundlePath))
    const outputPathExt = Path.extname(outputPath)
    fileContents = fileContents
      .replace(/SB_PUNDLE_PUBLIC_PRE/g, JSON.stringify(outputPath.slice(0, -1 * outputPathExt.length)))
      .replace(/SB_PUNDLE_PUBLIC_POST/g, JSON.stringify(outputPathExt))
  }
  return fileContents
}

export function getFileMappings(context: Context, chunk: FileChunk, config: Object) : Object {
  const mappings = {}

  function processImport(entry) {
    const filePath = getFilePath(context, config, entry.resolved || '')
    if (!mappings[filePath]) {
      mappings[filePath] = []
    }
    mappings[filePath].push(entry.id)
  }
  chunk.files.forEach(function(file) {
    file.getImports().forEach(processImport)
    file.getChunks().forEach(function(childChunk) {
      childChunk.imports.forEach(processImport)
    })
  })
  return mappings
}

export function mergeSourceMap(sourceMap: Object, target: Object, filePath: string, sourceContents: string, offset: number): void {
  const entryMap = new SourceMapConsumer(sourceMap)
  for (let i = 0, length = entryMap._generatedMappings.length; i < length; i++) {
    const mapping = entryMap._generatedMappings[i]
    target.addMapping({
      source: filePath,
      original: { line: mapping.originalLine, column: mapping.originalColumn },
      generated: { line: offset + mapping.generatedLine, column: mapping.generatedColumn },
    })
  }
  target.setSourceContent(filePath, sourceContents)
}
