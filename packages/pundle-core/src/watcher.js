// @flow

import path from 'path'
import pMap from 'p-map'
import PromiseQueue from 'sb-promise-queue'
import differenceBy from 'lodash/differenceBy'
import {
  Job,
  getChunk,
  getFileKey,
  getChunkKey,
  type Chunk,
  type Context,
  type ImportResolved,
  type ImportTransformed,
} from 'pundle-api'

import getFileWatcher from './file-watcher'

import type Master from './master'
import type { WatchOptions, InternalChangedFiles as ChangedFiles } from './types'

// Dangerous territory beyond this point. May God help us all
export default async function getWatcher({
  adapter = 'nsfw',
  tick,
  generate,
  pundle,
}: WatchOptions & { pundle: Master } = {}): Promise<{
  job: Job,
  queue: Object,
  context: Context,
  initialCompile(): Promise<void>,
  dispose(): void,
}> {
  const job = new Job()
  const { context } = pundle
  const queue = new PromiseQueue()
  let lastProcessError = null
  let initialCompilePromise = null

  const configChunks = (await Promise.all(
    context.config.entry.map(entry =>
      pundle.resolve({
        request: entry,
        requestFile: null,
        ignoredResolvers: [],
      }),
    ),
  )).map(resolved => getChunk(resolved.format, null, resolved.filePath))

  const tickCallback = async (oldFile: ?ImportTransformed, newFile: ImportTransformed) => {
    let removedChunks = []
    let removedImports = []
    if (oldFile) {
      removedChunks = differenceBy(oldFile.chunks, newFile.chunks, getChunkKey)
      removedImports = differenceBy(oldFile.imports, newFile.imports, getFileKey)
    }
    removedImports.forEach((fileImport: ImportResolved) => {
      const fileImportKey = getFileKey(fileImport)
      let found = configChunks.find(chunk => getFileKey(chunk) === fileImportKey)
      if (found) {
        // DO NOT DELETE ENTRIES
        return
      }
      job.files.forEach((file: ImportTransformed) => {
        found = found || file.imports.some(item => getFileKey(item) === fileImportKey) !== -1
      })
      if (!found) {
        job.files.delete(fileImportKey)
      }
    })
    removedChunks.forEach((chunk: Chunk) => {
      const chunkKey = getChunkKey(chunk)
      let found = configChunks.find(configChunk => getChunkKey(configChunk) === chunkKey)
      if (found) {
        // DO NOT DELETE ENTRIES
        return
      }
      job.files.forEach((file: ImportTransformed) => {
        found = found || file.chunks.some(item => getChunkKey(item) === chunkKey)
      })
      if (!found) {
        job.chunks.delete(chunkKey)
      }
    })
    try {
      if (tick) {
        tick({ context, job, oldFile, newFile })
      }
    } catch (error) {
      await pundle.report(error)
    }
  }

  const changed: ChangedFiles = new Map()
  // eslint-disable-next-line no-unused-vars
  const onChange = async (event, filePath, newPath) => {
    if (event === 'delete') {
      job.files.forEach((file, key) => {
        if (file.filePath === filePath) {
          job.files.delete(key)
        }
      })
    }

    function processChunk(chunk: Chunk, force: boolean) {
      if (chunk.entry && (chunk.entry === filePath || force)) {
        const chunkImport = { format: chunk.format, filePath: chunk.entry, meta: chunk.meta }
        changed.set(getFileKey(chunkImport), chunkImport)
      }
      if (chunk.imports.length) {
        chunk.imports.forEach(chunkImport => {
          if (chunkImport.filePath === filePath || force) {
            changed.set(getFileKey(chunkImport), chunkImport)
          }
        })
      }
    }
    function processFile(file: ImportTransformed) {
      if (file.filePath !== filePath && !file.imports.some(item => item.filePath === filePath)) return

      const fileImport = { format: file.format, filePath: file.filePath, meta: file.meta }
      const fileKey = getFileKey(fileImport)
      if (changed.has(fileKey)) return

      changed.set(fileKey, fileImport)
      file.chunks.forEach(chunk => processChunk(chunk, false))
    }

    configChunks.forEach(chunk => processChunk(chunk, false))
    job.files.forEach(file => {
      file.chunks.forEach(chunk => {
        processChunk(chunk, false)
      })
      processFile(file)
    })

    if (
      event === 'modify' &&
      lastProcessError &&
      filePath.endsWith('package.json') &&
      filePath === path.join(context.config.rootDirectory, 'package.json')
    ) {
      // Root level package.json modified, an unresolved resolved could have been npm installed?
      lastProcessError = null
      configChunks.forEach(chunk => processChunk(chunk, true))
    }
  }

  queue.onIdle(async () => {
    if (!generate || !changed.size || !initialCompilePromise) return

    await initialCompilePromise

    const currentChanged = new Map(changed)
    const currentChangedVals = Array.from(currentChanged.values())
    changed.clear()

    try {
      const locks = new Set()
      lastProcessError = null
      try {
        await Promise.all(
          currentChangedVals.map(request =>
            pundle.transformFileTree({
              job,
              locks,
              request,
              tickCallback,
              changedImports: currentChanged,
            }),
          ),
        )
      } catch (error) {
        lastProcessError = error
        throw error
      }
      queue.add(() => generate({ context, job, changed: currentChangedVals })).catch(pundle.report)
    } catch (error) {
      pundle.report(error)
    }
  })

  const watcher = getFileWatcher(adapter, context.config.rootDirectory, (...args) => {
    queue.add(() => onChange(...args)).catch(pundle.report)
  })

  await watcher.watch()

  return {
    job,
    queue,
    context,
    initialCompile: () => {
      if (!initialCompilePromise) {
        initialCompilePromise = pMap(configChunks, chunk =>
          pundle.transformChunk({
            job,
            chunk,
            locks: new Set(),
            tickCallback,
          }),
        ).catch(error => {
          initialCompilePromise = null
          throw error
        })
      }
      return initialCompilePromise
    },
    dispose() {
      watcher.close()
    },
  }
}
