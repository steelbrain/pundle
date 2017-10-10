// @flow

import pMap from 'p-map'
import { RECOMMENDED_CONCURRENCY } from 'pundle-api'
import type { Context } from 'pundle-api'
import type { File } from 'pundle-api/types'

export default class Compilation {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async processFile(resolved: string): Promise<File> {
    const file = this.context.getFile(resolved)
    return file
  }
  async processFileTree(
    request: string,
    requestRoot: ?string,
    locks: Set<string>,
    files: Map<string, File>,
    /* TODO: Add oldFiles here */
    forcedOverwite: boolean,
    tickCallback: (oldFile: ?File, newFile: File) => any,
  ): Promise<boolean> {
    const resolved = await this.context.resolveSimple(request, requestRoot)
    const oldFile = files.get(resolved)
    if (oldFile && !forcedOverwite) {
      return true
    }
    if (locks.has(resolved)) {
      return true
    }
    locks.add(resolved)
    let newFile
    try {
      newFile = await this.processFile(resolved)
    } finally {
      locks.delete(resolved)
    }
    await tickCallback(oldFile, newFile)
    files.set(resolved, newFile)
    return true
  }
  async build(): Promise<void> {
    const locks: Set<string> = new Set()
    const files: Map<string, File> = new Map()
    const chunks = this.context.config.entry.map(entry =>
      this.context.getChunk(entry, []),
    )
    await pMap(
      chunks,
      chunk => {
        this.processFileTree(
          chunk.entry,
          null,
          locks,
          files,
          false,
          (oldFile, newFile) => {
            console.log('oldFile', oldFile, 'newFile', newFile)
          },
        )
      },
      { concurrency: RECOMMENDED_CONCURRENCY },
    )
  }
}
