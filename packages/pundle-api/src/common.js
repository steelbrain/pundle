// @flow

import type { Chunk, Severity, ComponentType } from './types'

export const VALID_TYPES: Set<ComponentType> = new Set([
  'resolver',
  'reporter',
  'loader',
  'transformer',
  'plugin',
  'generator',
  'post-generator',
  'file-generator',
  'job-transformer',
])
export const VALID_SEVERITIES: Set<Severity> = new Set(['info', 'warning', 'error'])

export function normalizeFileName(fileName: string): string {
  if (fileName.charAt(0) !== '.') {
    return `./${fileName}`
  }
  return fileName
}

export function getLockKeyForChunk(chunk: Chunk): string {
  return `chunk:${chunk.entry || ''}:${chunk.imports.join(':')}:${chunk.type}:${chunk.format}`
}
export function getLockKeyForFile(file: string): string {
  return `file:${file}`
}
