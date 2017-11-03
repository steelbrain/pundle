// @flow

import pMap from 'p-map'
import { RECOMMENDED_CONCURRENCY, FileIssue } from 'pundle-api'
import type { Context } from 'pundle-api'
import type { File, Chunk } from 'pundle-api/lib/types'

export default class Compilation {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async loadFile(resolved: string): Promise<File> {
    const file = await this.context.getFile(resolved)

    const loaders = this.context.components.getLoaders()
    const plugins = this.context.components.getPlugins()
    const transformers = this.context.components.getTransformers()

    for (const entry of transformers) {
      const result = await entry.callback(this.context, this.context.options.get(entry), file)
      if (result) {
        file.mergeTransformation(result.contents, result.sourceMap)
      }
    }

    let loaderProcessed = false
    for (const entry of loaders) {
      const result = await entry.callback(this.context, this.context.options.get(entry), file)
      if (result) {
        loaderProcessed = true
        file.mergeTransformation(result.contents, result.sourceMap)
        result.chunks.forEach(chunk => file.addChunk(chunk))
        result.imports.forEach(chunk => file.addImport(chunk))
      }
    }
    if (!loaderProcessed) {
      throw new FileIssue({
        file: file.filePath,
        message: 'File not loaded, did you configure a loader for this filetype? Are you sure this file is not excluded?',
      })
    }
    for (const entry of plugins) {
      await entry.callback(this.context, this.context.options.get(entry), file)
    }

    return file
  }
  async generateChunk(chunk: Chunk, files: Map<string, File>): Promise<void> {
    // TODO: invoke chunk-generate
    console.log('chunk', chunk, 'files', files)
  }
  async processFileTree(
    resolved: string,
    locks: Set<string>,
    files: Map<string, File>,
    /* TODO: Add oldFiles here */
    forcedOverwite: boolean,
    tickCallback: (oldFile: ?File, newFile: File) => any,
  ): Promise<boolean> {
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
      newFile = await this.loadFile(resolved)
      // TODO: Go over all of it's imports and chunks here
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
    const chunks = this.context.config.entry.map(async entry =>
      this.context.getChunk(await this.context.resolveSimple(entry), []),
    )
    await pMap(
      chunks,
      (chunk: Chunk) =>
        this.processFileTree(chunk.entry, locks, files, false, (oldFile, newFile) => {
          // TODO: Do some relevant magic here
          console.log('oldFile', oldFile && oldFile.filePath, 'newFile', newFile.filePath)
        }),
      { concurrency: RECOMMENDED_CONCURRENCY },
    )
    const generated = await pMap(chunks, chunk => this.generateChunk(chunk, files), {
      concurrency: RECOMMENDED_CONCURRENCY,
    })
    console.log('generated', generated)
  }
}
