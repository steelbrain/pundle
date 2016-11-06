/* @flow */

import Path from 'path'
import { SourceMapConsumer } from 'source-map'
import type { File, Import } from 'pundle-api/types'

export const LINE_BREAK = /\r\n|\n|\r/
export function getLinesCount(text: string): number {
  return text.split(LINE_BREAK).length
}

let nextNumericPath = 1
export const numericPaths: Map<string, string> = new Map()
export function getFilePath(compilation: Object, config: Object, filePath: string): string {
  let toReturn
  if (config.pathType === 'filePath') {
    toReturn = Path.join(`$${config.sourceMapNamespace}`, Path.relative(compilation.config.rootDirectory, filePath))
  } else {
    toReturn = numericPaths.get(filePath)
    if (!toReturn) {
      nextNumericPath++
      numericPaths.set(filePath, toReturn = `un-${nextNumericPath}`)
    }
  }
  return toReturn
}

export async function normalizeEntry(compilation: Object, config: Object): Promise<Array<string>> {
  let entry = config.entry
  if (!Array.isArray(entry)) {
    entry = compilation.config.entry
  }
  entry = entry.slice()

  for (let i = 0, length = entry.length; i < length; i++) {
    const item = entry[i]
    if (!Path.isAbsolute(item)) {
      entry[i] = await compilation.resolve(item)
    }
  }

  return entry
}
export const wrapperHMR = require.resolve('./wrappers/hmr')
export const wrapperNormal = require.resolve('./wrappers/normal')
export async function getWrapperContents(compilation: Object, config: Object): Promise<string> {
  let wrapper = config.wrapper
  if (wrapper === 'normal') {
    wrapper = wrapperNormal
  } else if (wrapper === 'hmr') {
    wrapper = wrapperHMR
  } else if (wrapper === 'none') {
    return ''
  }
  if (!Path.isAbsolute(wrapper)) {
    wrapper = await compilation.resolve(wrapper)
  }
  return await compilation.config.fileSystem.readFile(wrapper)
}

export function getImportResolutions(compilation: Object, config: Object, files: Array<File>) : Object {
  const resolutionMap = {}

  function mergeResolutions(entry: Import) {
    if (!entry.resolved) {
      throw new Error(`Error generating output, ${entry.request} not resolved from ${entry.from}`)
    }
    const filePath = getFilePath(compilation, config, entry.resolved)
    if (resolutionMap[filePath]) {
      resolutionMap[filePath].push(entry.id)
    } else {
      resolutionMap[filePath] = [entry.id]
    }
  }

  for (let i = 0, length = files.length; i < length; i++) {
    files[i].imports.forEach(mergeResolutions)
  }
  return resolutionMap
}

export function mergeSourceMap(sourceMap: Object, target: Object, filePath: string, sourceContents: string, offset: number): void {
  const entryMap = new SourceMapConsumer(sourceMap)
  for (let _i = 0, _length = entryMap._generatedMappings.length; _i < _length; _i++) {
    const mapping = entryMap._generatedMappings[_i]
    target.addMapping({
      source: filePath,
      original: { line: mapping.originalLine, column: mapping.originalColumn },
      generated: { line: offset + mapping.generatedLine, column: mapping.generatedColumn },
    })
  }
  target.setSourceContent(filePath, sourceContents)
}
