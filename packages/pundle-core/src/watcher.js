// @flow

import pMap from 'p-map'
import PromiseQueue from 'sb-promise-queue'
import differenceBy from 'lodash/differenceBy'
import {
  Job,
  getChunk,
  getFileKey,
  getChunkKey,
  getDependencyOrder,
  type Chunk,
  type Context,
  type ImportResolved,
  type ImportTransformed,
} from 'pundle-api'

import getFileWatcher from './file-watcher'

import type Master from './master'
import type { WatchOptions } from './types'

function getWeightForChangedItem({ event, key }, graph) {
  let eventWeight = 0
  if (event === 'add') {
    eventWeight = 100000
  } else if (event === 'delete') {
    eventWeight = 200000
  }
  const indexWeight = graph.indexOf(key)

  return eventWeight + indexWeight
}

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
  initialCompile(): Promise<void>,
  dispose(): void,
}> {
  const job = new Job()
  const { context } = pundle
  const queue = new PromiseQueue()
  let initialCompilePromise = null

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
    if (!generate || !changed.size || !initialCompilePromise) return

    await initialCompilePromise

    const currentChanged = Array.from(changed.values())
    changed.clear()

    const graph = getDependencyOrder(currentChanged.map(item => item.file), job.files)
    currentChanged.sort(function(a, b) {
      return getWeightForChangedItem(b, graph) - getWeightForChangedItem(a, graph)
    })

    try {
      const locks = new Set()
      const changedImports = new Set(currentChanged.map(item => item.key))
      await pMap(currentChanged, ({ file: request }) =>
        pundle.transformFileTree({
          job,
          locks,
          request,
          tickCallback,
          changedImports,
        }),
      )
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
