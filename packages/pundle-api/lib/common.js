// @flow

import path from 'path'
import globrex from 'globrex'
import resolveFrom from 'resolve-from'
import Imurmurhash from 'imurmurhash'

import type Context from './context'
import type { Loc, Chunk, ImportResolved } from './types'

export const NEWLINE_REGEXP = /\r\n|[\n\r\u2028\u2029]/

export function getStringHash(str: string): string {
  return new Imurmurhash()
    .hash(str)
    .result()
    .toString()
}

export function getUniqueHash(item: ImportResolved | Chunk): string {
  let stringKey = ''
  if (typeof item.filePath === 'string') {
    stringKey = item.filePath
  } else if (typeof item.label === 'string') {
    stringKey = item.label
  } else if (typeof item.entry === 'string') {
    stringKey = item.entry
  } else if (Array.isArray(item.imports)) {
    stringKey += `${JSON.stringify(item.imports)}`
  }

  const hash = new Imurmurhash()
    .hash(stringKey)
    .result()
    .toString()
  return `${item.format}_${hash}`
}

export function getChunkKey(chunk: Chunk): string {
  return `chunk_${getUniqueHash(chunk)}`
}

export function getFileKey(item: ImportResolved | Chunk): string {
  return `file_${getUniqueHash(item)}`
}

export function getChunk(
  format: string,
  label: ?string = null,
  entry: ?string = null,
  imports: Array<ImportResolved> = [],
): Chunk {
  return {
    format,
    entry,
    label,
    imports,
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

  const parsed = output.entry ? path.parse(output.entry) : null

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

export function loadLocalFromContext(context: Context, names: Array<string>): { name: ?string, exported: any } {
  const { rootDirectory } = context.config

  for (let i = 0, { length } = names; i < length; i++) {
    const name = names[i]
    let resolved
    try {
      resolved = resolveFrom(rootDirectory, name)
    } catch (_) {
      continue
    }
    // $FlowFixMe: Dynamic require :)
    const exported = require(resolved) // eslint-disable-line global-require,import/no-dynamic-require

    return { name, exported }
  }

  return { name: null, exported: {} }
}
