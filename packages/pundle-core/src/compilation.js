// @flow

import pMap from 'p-map'
import { FileIssue, MessageIssue, type Context, type File, type Chunk } from 'pundle-api'

import Job from './job'

type TickCallback = (oldFile: ?File, newFile: File) => any

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
        break
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
  async generateChunk(
    chunk: Chunk,
    files: Map<string, File>,
  ): Promise<{|
    contents: string,
    sourceMap: ?Object,
  |}> {
    const generators = this.context.components.getGenerators()
    const postGenerators = this.context.components.getPostGenerators()

    let generated
    for (const entry of generators) {
      generated = await entry.callback(this.context, this.context.options.get(entry), chunk, files)
      if (generated) {
        break
      }
    }
    if (!generated) {
      throw new MessageIssue(
        "Unable to generate chunk. Did you configure a generator? Are you sure it's configured correctly?",
      )
    }
    for (const entry of postGenerators) {
      const postGenerated = await entry.callback(this.context, this.context.options.get(entry), generated)
      if (postGenerated) {
        generated = postGenerated
      }
    }
    return generated
  }
  async processFileTree(resolved: string, job: Job, forcedOverwite: boolean, tickCallback: TickCallback): Promise<void> {
    const oldFile = job.files.get(resolved)
    const lockKey = job.getLockKeyForFile(resolved)
    if (oldFile && !forcedOverwite) {
      return
    }
    // TODO: Use cached old file here somewhere
    if (job.locks.has(lockKey)) {
      return
    }
    if (job.files.has(resolved) && !forcedOverwite) {
      return
    }
    job.locks.add(lockKey)
    let newFile
    try {
      newFile = await this.loadFile(resolved)
      job.files.set(resolved, newFile)
      await pMap(newFile.imports, entry => this.processFileTree(entry, job, false, tickCallback))
      await pMap(newFile.chunks, entry => this.processChunk(entry, job, false, tickCallback))
      await tickCallback(oldFile, newFile)
    } catch (error) {
      if (oldFile) {
        job.files.set(resolved, oldFile)
      } else {
        job.files.delete(resolved)
      }
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async processChunk(chunk: Chunk, job: Job, forcedOverwite: boolean, tickCallback: TickCallback): Promise<void> {
    // No need to process if imports-only
    const entry = chunk.entry
    if (!entry) return

    const lockKey = job.getLockKeyForChunk(chunk)
    const oldChunk = job.chunks.get(lockKey)
    if (job.locks.has(lockKey) || job.chunks.has(lockKey)) {
      return
    }
    if (job.chunks.has(lockKey) && !forcedOverwite) {
      return
    }
    job.locks.add(lockKey)
    try {
      job.chunks.set(lockKey, chunk)
      await this.processFileTree(entry, job, forcedOverwite, tickCallback)
    } catch (error) {
      if (oldChunk) {
        job.chunks.set(lockKey, oldChunk)
      } else {
        job.chunks.delete(lockKey)
      }
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async build(): Promise<void> {
    const job = new Job()
    const chunks = this.context.config.entry.map(async entry =>
      this.context.getChunk(await this.context.resolveSimple(entry), []),
    )
    await pMap(chunks, chunk =>
      this.processChunk(chunk, job, false, function() {
        /* No Op */
      }),
    )
    const generated = await pMap(chunks, chunk => this.generateChunk(chunk, job.files))
    console.log('generated', generated)
  }
}
