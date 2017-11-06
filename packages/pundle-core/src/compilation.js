// @flow

import pMap from 'p-map'
import { RECOMMENDED_CONCURRENCY, FileIssue } from 'pundle-api'
import type { Context, File } from 'pundle-api'
import type { Chunk } from 'pundle-api/lib/types'

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
    oldFiles: Map<string, File>,
    forcedOverwite: boolean,
    tickCallback: (oldFile: ?File, newFile: File) => any,
  ): Promise<void> {
    const oldFile = files.get(resolved)
    const lockKey = `file:${resolved}`
    if (oldFile && !forcedOverwite) {
      return
    }
    if (locks.has(lockKey) || files.has(resolved)) {
      return
    }
    locks.add(lockKey)
    let newFile
    try {
      newFile = await this.loadFile(resolved)
      await pMap(newFile.imports, entry => this.processFileTree(entry, locks, files, oldFiles, forcedOverwite, tickCallback))
      await pMap(newFile.chunks, entry => this.processChunk(entry, locks, files, oldFiles))
      await tickCallback(oldFile, newFile)
      files.set(resolved, newFile)
    } finally {
      locks.delete(lockKey)
    }
  }
  async processChunk(
    chunk: Chunk,
    locks: Set<string>,
    files: Map<string, File>,
    oldFiles: Map<string, File>,
  ): Promise<void> {
    // TODO: Pass the chunks array in here and don't add chunk if it already exists in it
    const lockKey = `file:${chunk.entry}:${chunk.imports.join(':')}`
    if (locks.has(lockKey)) {
      return
    }
    locks.add(lockKey)
    try {
      this.processFileTree(chunk.entry, locks, files, oldFiles, false, (oldFile, newFile) => {
        // TODO: Do some relevant magic here
        console.log('oldFile', oldFile && oldFile.filePath, 'newFile', newFile.filePath)
      })
    } finally {
      locks.delete(lockKey)
    }
  }
  async build(): Promise<void> {
    const locks: Set<string> = new Set()
    const files: Map<string, File> = new Map()
    const oldFiles = new Map()
    const chunks = this.context.config.entry.map(async entry =>
      this.context.getChunk(await this.context.resolveSimple(entry), []),
    )
    await pMap(chunks, chunk => this.processChunk(chunk, locks, files, oldFiles))
    const generated = await pMap(chunks, chunk => this.generateChunk(chunk, files))
    console.log('generated', generated)
  }
}
