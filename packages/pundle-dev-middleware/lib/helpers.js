// @flow

import invariant from 'assert'
import { posix as path } from 'path'
import { getPundleConfig } from 'pundle-core'
import { getFileKey, type Job, type Chunk, type ImportResolved } from 'pundle-api'

export async function getOutputFormats(pundleOptions: Object, publicPath: string): { [string]: string | false } {
  const pundleConfig = await getPundleConfig(pundleOptions)
  const { formats } = pundleConfig.output

  const newFormats = {}
  Object.keys(formats).forEach(function(key) {
    const value = formats[key]
    if (value) {
      newFormats[key] = path.join(publicPath, value)
    } else {
      newFormats[key] = value
    }
  })

  return newFormats
}

export function getChunksAffectedByImports(job: Job, chunks: Array<Chunk>, imports: Array<ImportResolved>): Array<Chunk> {
  const affected = []
  const filePaths = imports.map(i => i.filePath)

  chunks.forEach(chunk => {
    const relevantFiles = new Set()
    const relevantFilePaths = new Set()

    function iterateImports(fileImport: ImportResolved) {
      const file = job.files.get(getFileKey(fileImport))
      invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)

      if (relevantFiles.has(file)) return
      relevantFiles.add(file)
      relevantFilePaths.add(file.filePath)

      file.imports.forEach(iterateImports)
    }

    if (chunk.entry) {
      iterateImports({
        format: chunk.format,
        filePath: chunk.entry,
      })
    }
    chunk.imports.forEach(iterateImports)

    if (filePaths.some(item => relevantFilePaths.has(item))) {
      affected.push(chunk)
    }
  })

  return affected
}
