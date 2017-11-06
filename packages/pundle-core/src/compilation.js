// @flow

import pMap from 'p-map'
import { FileIssue } from 'pundle-api'
import type { Context, File } from 'pundle-api'
import type { Chunk } from 'pundle-api/lib/types'
import type { Job } from './types'

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
    console.log('chunk', chunk, 'files', files.size)
  }
  async processFileTree(
    resolved: string,
    job: Job,
    forcedOverwite: boolean,
    tickCallback: (oldFile: ?File, newFile: File) => any,
  ): Promise<void> {
    const oldFile = job.files.get(resolved)
    const lockKey = `file:${resolved}`
    if (oldFile && !forcedOverwite) {
      return
    }
    // TODO: Use old files here somewhere
    if (job.locks.has(lockKey) || job.files.has(resolved)) {
      return
    }
    job.locks.add(lockKey)
    let newFile
    try {
      newFile = await this.loadFile(resolved)
      await pMap(newFile.imports, entry => this.processFileTree(entry, job, false, tickCallback))
      await pMap(newFile.chunks, entry => this.processChunk(entry, job))
      await tickCallback(oldFile, newFile)
      job.files.set(resolved, newFile)
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async processChunk(chunk: Chunk, job: Job): Promise<void> {
    // No need to process if file-only
    const entry = chunk.entry
    if (!entry) return

    // TODO: Use old chunk here somewhere
    const lockKey = `file:${entry}:${chunk.imports.join(':')}`
    if (job.locks.has(lockKey) || job.chunks.has(lockKey)) {
      return
    }
    job.locks.add(lockKey)
    try {
      await this.processFileTree(entry, job, false, (oldFile, newFile) => {
        // TODO: Do some relevant magic here
        console.log('oldFile', oldFile && oldFile.filePath, 'newFile', newFile.filePath)
      })
      job.chunks.set(lockKey, chunk)
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async build(): Promise<void> {
    const job = {
      locks: new Set(),
      chunks: new Map(),
      oldChunks: new Map(),
      files: new Map(),
      oldFiles: new Map(),
    }
    const chunks = this.context.config.entry.map(async entry =>
      this.context.getChunk(await this.context.resolveSimple(entry), []),
    )
    await pMap(chunks, chunk => this.processChunk(chunk, job))
    const generated = await pMap(chunks, chunk => this.generateChunk(chunk, job.files))
    console.log('generated', generated)
  }
}
