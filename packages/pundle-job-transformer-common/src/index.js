// @flow

import invariant from 'assert'
import { createJobTransformer, type Chunk } from 'pundle-api'

import { version } from '../package.json'

export default function() {
  return createJobTransformer({
    name: 'pundle-job-transformer-common',
    version,
    async callback(context, options, job) {
      const chunkHitsByFile: {
        [string]: Set<Chunk>,
      } = {}
      const fileHitsByFile: {
        [string]: Set<string>,
      } = {}

      function iterateImports(filePath: string, parent: ?string, chunk: Chunk) {
        const file = job.files.get(filePath)
        invariant(file, `Job.files does not have '${filePath}'`)
        if (parent) {
          if (!fileHitsByFile[filePath]) {
            fileHitsByFile[filePath] = new Set()
          }
          fileHitsByFile[filePath].add(parent)
        }
        if (!chunkHitsByFile[filePath]) {
          chunkHitsByFile[filePath] = new Set()
        }
        if (chunkHitsByFile[filePath].has(chunk)) return
        chunkHitsByFile[filePath].add(chunk)
        file.imports.forEach(entry => iterateImports(entry, filePath, chunk))
      }

      job.chunks.forEach(chunk => {
        if (chunk.type === 'simple' && chunk.entry) {
          iterateImports(chunk.entry, null, chunk)
        }
      })

      let addedCommonsChunk = false
      const commonsChunk = context.getSimpleChunk(null, [], 'commons')
      for (const [filePath, chunksSet]: [string, any] of Object.entries(chunkHitsByFile)) {
        const chunks: Array<Chunk> = Array.from(chunksSet)
        const fileHits: Array<string> = Array.from(fileHitsByFile[filePath] || [])
        if (!fileHits.length || chunks.some(c => c.entry === filePath) || chunks.length < 2) continue
        // ^ Ignore entries and stuff like that
        commonsChunk.imports.push(filePath)
        fileHits.forEach(parentPath => {
          const file = job.files.get(parentPath)
          invariant(file, `Job.files does not have '${parentPath}'`)
          const idx = file.imports.indexOf(filePath)
          if (idx !== -1) {
            file.imports.splice(idx, 1)
          }
          file.addChunk(commonsChunk)
        })
        addedCommonsChunk = true
      }
      if (addedCommonsChunk) {
        job.chunks.unshift(commonsChunk)
      }
      return {
        job,
      }
    },
    defaultOptions: {},
  })
}
