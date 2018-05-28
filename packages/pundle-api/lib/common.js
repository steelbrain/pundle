// @flow

import path from 'path'
import globrex from 'globrex'
import Imurmurhash from 'imurmurhash'
import type { Chunk, ImportResolved, GetFileNamePayload } from './types'

export function getChunkHash(chunk: Chunk): string {
  const hash = new Imurmurhash()
    .hash(chunk.label || chunk.entry || '')
    .result()
    .toString()
  return hash
}
export function getChunkKey(chunk: Chunk): string {
  return `chunk_${chunk.format}_${getChunkHash(chunk)}`
}
export function getFileImportHash(item: ImportResolved | Chunk): string {
  let entry = ''
  if (typeof item.filePath === 'string') {
    entry = item.filePath
  } else if (typeof item.entry === 'string') {
    // TODO: Eslint bug?
    // eslint-disable-next-line prefer-destructuring
    entry = item.entry
  }

  const hash = new Imurmurhash()
    .hash(entry)
    .result()
    .toString()
  return `${item.format}_${hash}`
}
export function getFileKey(item: ImportResolved | Chunk): string {
  return `file_${item.format}_${getFileImportHash(item)}`
}

export function getChunk(format: string, label: ?string = null, entry: ?string = null): Chunk {
  if (!label && !entry) {
    throw new Error('Either label or entry are required to make a chunk')
  }
  return {
    format,
    entry,
    label,
    imports: [],
  }
}

const outputFormatCache = {}
export function getFileName(formats: { [string]: string | false }, output: GetFileNamePayload): string | false {
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
  const hash = getChunkHash(output)

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
