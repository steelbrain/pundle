// @flow

import invariant from 'assert'
import { posix as path } from 'path'
import { getPundleConfig } from 'pundle-core'
import { getFileKey, type Job, type Chunk, type ImportResolved } from 'pundle-api'

export async function getOutputFormats(pundleOptions: Object, publicPath: string): { [string]: string | false } {
  invariant(publicPath.length, 'publicPath must never be empty')

  const pundleConfig = await getPundleConfig(pundleOptions)
  const { formats } = pundleConfig.output

  const newFormats = {}
  Object.keys(formats).forEach(function(key) {
    const value: string | false = formats[key]
    if (value) {
      newFormats[key] = path.join(publicPath, value)
    } else {
      newFormats[key] = value
    }
  })

  return newFormats
}

export function getChunksAffectedByImports(
  job: Job,
  chunks: Array<Chunk>,
  changedImports: Array<ImportResolved>,
): Array<Chunk> {
  const affected = []
  const changedImportsKeys = changedImports.map(getFileKey)

  chunks.forEach(chunk => {
    const relevantFiles = new Set()

    function iterateImports(fileImport: ImportResolved) {
      const fileKey = getFileKey(fileImport)
      const file = job.files.get(fileKey)
      invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

      if (relevantFiles.has(fileKey)) return
      relevantFiles.add(fileKey)

      file.imports.forEach(iterateImports)
    }

    if (chunk.filePath) {
      iterateImports({
        meta: chunk.meta,
        format: chunk.format,
        filePath: chunk.filePath,
      })
    }
    chunk.imports.forEach(iterateImports)

    if (changedImportsKeys.some(item => relevantFiles.has(item))) {
      affected.push(chunk)
    }
  })

  return affected
}
