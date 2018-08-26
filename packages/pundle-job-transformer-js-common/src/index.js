// @flow

import invariant from 'assert'
import {
  createJobTransformer,
  getChunk,
  getFileKey,
  getChunkKey,
  type ImportResolved,
  type ImportTransformed,
} from 'pundle-api'

import manifest from '../package.json'

function fileToImport(file: ImportTransformed): ImportResolved {
  return { filePath: file.filePath, format: file.format, meta: file.meta }
}

function createComponent({ name = '_common_' }: { name?: string } = {}) {
  return createJobTransformer({
    name: 'pundle-job-transformer-js-common',
    version: manifest.version,
    async callback({ context, job }) {
      if (context.config.target === 'browser') {
        return null
      }

      const chunkToFiles = new Map()

      job.chunks.forEach(chunk => {
        if (!chunk.root) return

        const relevantFiles = new Set()

        function iterateImports(fileImport: ImportResolved, topLevelOnly: boolean) {
          const file = job.files.get(getFileKey(fileImport))
          invariant(file, `File referenced in chunk ('${fileImport.filePath}') not found in local cache!?`)
          if (relevantFiles.has(file)) return

          relevantFiles.add(file)
          if (!topLevelOnly) {
            file.imports.forEach(item => iterateImports(item, false))
          }
        }

        if (chunk.filePath) {
          iterateImports(
            {
              meta: chunk.meta,
              format: chunk.format,
              filePath: chunk.filePath,
            },
            false,
          )
        }
        chunk.imports.forEach(item => iterateImports(item, true))
        chunkToFiles.set(chunk, Array.from(relevantFiles))
      })

      let commonFiles = []
      chunkToFiles.forEach((files, chunk) => {
        if (chunk.format === 'js') {
          commonFiles = commonFiles.concat(files)
        }
      })
      const duplicateFiles = commonFiles.filter((file, index) => {
        const lastIndex = commonFiles.lastIndexOf(file)
        if (index !== lastIndex) {
          const firstIndex = commonFiles.indexOf(file)
          if (firstIndex === index) return true
        }
        return false
      })

      if (!duplicateFiles.length) return null

      const clonedJob = job.clone()
      const clonedChunks = new Map()
      const commonChunk = getChunk('js', name, null, duplicateFiles.map(fileToImport))

      chunkToFiles.forEach((files, chunk) => {
        let hadOne = false
        duplicateFiles.forEach(file => {
          const index = files.indexOf(file)
          if (index !== -1) {
            hadOne = true
            files.splice(index, 1)
          }
        })

        let clonedChunk = chunk
        if (hadOne) {
          clonedChunk = { ...clonedChunk, imports: files.map(fileToImport) }
        }
        clonedChunks.set(getChunkKey(clonedChunk), clonedChunk)
      })

      clonedChunks.set(getChunkKey(commonChunk), commonChunk)

      clonedJob.chunks = clonedChunks

      return { job: clonedJob }
    },
  })
}

module.exports = createComponent
