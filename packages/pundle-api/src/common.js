// @flow

import path from 'path'
import globrex from 'globrex'
import toposort from 'toposort'
import invariant from 'assert'
import resolveFrom from 'resolve-from'
import murmurHash from 'node-murmurhash'

import type Context from './context'
import type { Loc, Chunk, ImportResolved, ImportMeta, ImportTransformed } from './types'

export const NEWLINE_REGEXP = /\r\n|[\n\r\u2028\u2029]/
export const DEFAULT_IMPORT_META = { specified: true }

export function getStringHash(str: string): string {
  return murmurHash(Buffer.from(str, 'ascii'))
}

export function getUniqueHash(item: ImportResolved | Chunk): string {
  let stringKey = ''
  if (typeof item.filePath === 'string') {
    stringKey = item.filePath
  } else if (typeof item.label === 'string') {
    stringKey = item.label
  } else if (Array.isArray(item.imports)) {
    stringKey = `${JSON.stringify(item.imports)}`
  }
  const { specified } = item.meta
  stringKey += `specified=${specified.toString()}`

  return `${item.format}_${getStringHash(stringKey)}`
}

export function getChunkKey(chunk: Chunk): string {
  return `chunk_${chunk.root ? '1' : '0'}$${getUniqueHash(chunk)}`
}

export function getFileKey(item: ImportResolved | Chunk): string {
  return `file_${getUniqueHash(item)}`
}

export function getChunk(
  format: string,
  label: ?string = null,
  filePath: ?string = null,
  imports: Array<ImportResolved> = [],
  root: boolean = true,
  flat: boolean = false,
  meta: ImportMeta = DEFAULT_IMPORT_META,
): Chunk {
  return {
    format,
    label,
    filePath,
    imports,
    root,
    flat,
    meta,
  }
}

const outputFormatCache = {}
export function getPublicPath(formats: { [string]: string | false }, output: Chunk): string | false {
  const formatKeys = Object.keys(formats).sort((a, b) => b.length - a.length)

  const formatOutput = formatKeys.find(formatKey => {
    let regex = outputFormatCache[formatKey]
    if (!regex) {
      const result = globrex(formatKey)
      regex = result.regex // eslint-disable-line prefer-destructuring
      outputFormatCache[formatKey] = result.regex
    }

    return regex.test(output.format)
  })

  if (typeof formatOutput === 'undefined') {
    throw new Error(`Unable to find output path for format '${output.format}' in config file`)
  }
  const [, hash] = getUniqueHash(output).split('_')

  const format = formats[formatOutput]
  if (format === false) {
    return false
  }
  if (typeof format !== 'string') {
    throw new Error(`formats.${output.format} MUST be either string OR false`)
  }

  const parsed = output.filePath ? path.parse(output.filePath) : null

  return format
    .replace('[format]', output.format)
    .replace('[name]', parsed ? parsed.name : hash)
    .replace('[ext]', parsed ? parsed.ext : '')
    .replace('[id]', hash)
}

export function characterOffsetToLoc(contents: string, characterOffset: number): ?Loc {
  const injection = `__SB_PUNDLE_TEMP_INJECTION_FOR_OFFSET_${Math.random()}`
  const injectedText = contents.slice(0, characterOffset) + injection + contents.slice(characterOffset)
  const lines = injectedText.split(NEWLINE_REGEXP)

  for (let i = 0, { length } = lines; i < length; i++) {
    const currentLine = lines[i]
    const index = currentLine.indexOf(injection)
    if (index !== -1) {
      return {
        line: i + 1,
        col: index,
      }
    }
  }

  return null
}

export async function loadLocalFromContext(context: Context, name: string): Promise<any> {
  const { rootDirectory } = context.config

  let resolved
  try {
    resolved = resolveFrom(rootDirectory, name)
    // $FlowFixMe: Dynamic require :)
    return require(resolved) // eslint-disable-line global-require,import/no-dynamic-require
  } catch (_) {
    if (!resolved) {
      let relative = path.relative(process.cwd(), context.config.rootDirectory)
      if (!relative.startsWith('.')) {
        relative = `./${relative}`
      }
      throw new Error(
        `'${name}' not found in Project Root (${relative}). Pundle needs it to process a filetype you use in your project. You can install it with \`npm install --dev ${name}\` or \`yarn add --dev ${name}\``,
      )
    }
    throw _
  }
}

// Returns deepest dependency first of all
export function getDependencyOrder(rootFiles: Array<ImportResolved | Chunk>, knownFiles: Map<string, ImportTransformed>) {
  const graph = []
  const processedFiles = new Set()

  function iterateImports(entry: ImportResolved | Chunk, from: ?string = '$root') {
    const entryKey = getFileKey(entry)
    const file = knownFiles.get(entryKey)
    invariant(file, `File referenced in chunk ('${entry.filePath || ''}') not found in local cache!?`)

    if (processedFiles.has(entryKey)) return
    processedFiles.add(entryKey)
    graph.push([from, entryKey])

    file.imports.forEach(item => iterateImports(item, entryKey))
    file.chunks.forEach(item => iterateImports(item, entryKey))
  }

  rootFiles.forEach(item => {
    iterateImports(item)
  })

  return (
    toposort(graph)
      .reverse()
      // Remove $root
      .slice(0, -1)
  )
}
