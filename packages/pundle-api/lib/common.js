// @flow

import path from 'path'
import globrex from 'globrex'
import Imurmurhash from 'imurmurhash'
import type { Chunk } from './types'

export function getChunkHash(identifier: string, format: string): string {
  const hash = new Imurmurhash()
    .hash(identifier)
    .result()
    .toString()
  return `c${format}${hash}`
}
export function getFileImportHash(filePath: string, format: string): string {
  const hash = new Imurmurhash()
    .hash(filePath)
    .result()
    .toString()
  return `p${format}${hash}`
}

export function getChunk(format: string, label: ?string = null, entry: ?string = null): Chunk {
  let id
  if (label) {
    id = getChunkHash(label, format)
  } else if (entry) {
    id = getChunkHash(entry, format)
  } else {
    throw new Error('Either label or entry are required to make a chunk')
  }
  return {
    id,
    format,
    entry,
    label,
    imports: [],
  }
}

const outputFormatCache = {}
export function getFileName(
  formats: { [string]: string | false },
  output: { id: string, entry: ?string, format: string },
): string | false {
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

  const format = formats[formatOutput]
  if (format === false) {
    return false
  }
  if (typeof format !== 'string') {
    throw new Error(`formats.${output.format} MUST be either string OR false`)
  }
  return format
    .replace('[id]', output.id)
    .replace('[format]', output.format)
    .replace('[name]', output.entry ? path.parse(output.entry).name : output.id)
}
