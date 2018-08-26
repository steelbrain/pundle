// @flow

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
import type { WatchOptions } from './types'

// Dangerous territory beyond this point. May God help us all
export default async function getWatcher({
  adapter = 'chokidar',
  tick,
  generate,
  pundle,
}: WatchOptions & { pundle: Master } = {}): Promise<{
  job: Job,
  queue: Object,
  context: Context,
  compile(): Promise<void>,
  dispose(): void,
}> {
  const job = new Job()
  const { context } = pundle
  const queue = new PromiseQueue()

  let isFirstCompile = true
  let needsRecompilation = false

  const configChunks = (await Promise.all(
    context.config.entry.map(entry =>
      pundle.resolveStrict({
        meta: null,
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

  let lastChangedImports = new Set()
  async function compile({ changedImports = new Set() }: { changedImports?: Set<string> } = {}) {
    if (!needsRecompilation && !isFirstCompile) {
      return
    }
    const oldIsFirstCompile = isFirstCompile
    isFirstCompile = false
    needsRecompilation = false

    const locks = new Set()
    const changedImportsCombined = new Set([...changedImports, ...lastChangedImports])

    try {
      const changedImportsRef = new Set(changedImportsCombined)
      await pMap(configChunks, chunk =>
        pundle.transformChunk({
          job,
          chunk,
          locks,
          tickCallback,
          changedImports: changedImportsRef,
        }),
      )
      lastChangedImports.clear()
    } catch (error) {
      isFirstCompile = oldIsFirstCompile
      needsRecompilation = !isFirstCompile
      lastChangedImports = changedImportsCombined

      throw error
    }
  }

  const changed = new Map()
  const onChange = async (event, filePath, newPath) => {
    job.files.forEach(function(file) {
      if (file.filePath === filePath || file.filePath === newPath) {
        const key = getFileKey(file)
        changed.set(key, {
          key,
          event,
          file,
        })
      }
    })
  }

  queue.onIdle(async () => {
    if (!generate || isFirstCompile || (!changed.size && !needsRecompilation)) {
      return
    }
    changed.forEach(function(item) {
      if (item.event === 'delete') {
        job.files.delete(item.file)
      }
    })

    const currentChanged = Array.from(changed.values())
    changed.clear()

    try {
      const changedImports = new Set(currentChanged.map(item => item.key))
      needsRecompilation = true
      await compile({
        changedImports,
      })
      queue.add(() => generate({ context, job, changed: currentChanged.map(item => item.file) })).catch(pundle.report)
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
    compile,
    dispose() {
      watcher.close()
    },
  }
}
