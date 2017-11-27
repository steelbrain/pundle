// @flow

import fs from 'fs'
import path from 'path'
import pMap from 'p-map'
import invariant from 'assert'
import sourceMapToComment from 'source-map-to-comment'
import { promisifyAll } from 'sb-promisify'
import {
  FileIssue,
  MessageIssue,
  Job,
  getLockKeyForFile,
  getLockKeyForChunk,
  type ChunkGenerated,
  type Context,
  type File,
  type Chunk,
} from 'pundle-api'

import * as Helpers from './helpers'

const pfs = promisifyAll(fs)

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
  async generateSimpleChunk(
    chunk: Chunk,
    job: Job,
  ): Promise<{|
    contents: string,
    sourceMap: ?Object,
  |}> {
    const generators = this.context.components.getGenerators()
    const postGenerators = this.context.components.getPostGenerators()

    let generated
    for (const entry of generators) {
      generated = await entry.callback(this.context, this.context.options.get(entry), chunk, job)
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
      const postGenerated = await entry.callback(this.context, this.context.options.get(entry), generated, job)
      if (postGenerated) {
        generated = postGenerated
      }
    }
    return generated
  }
  async generateFileChunk(
    chunk: Chunk,
    job: Job,
  ): Promise<{|
    contents: Buffer,
  |}> {
    const chunkEntry = chunk.entry
    const fileGenerators = this.context.components.getFileGenerators()
    if (!chunkEntry) {
      throw new MessageIssue('File chunks does not have an entry')
    }
    const entryFile = job.files.get(chunkEntry)
    if (!entryFile) {
      throw new MessageIssue('File Chunk entry file was not found in files map')
    }

    let generated = entryFile.sourceContents
    for (const entry of fileGenerators) {
      const postGenerated = await entry.callback(
        this.context,
        this.context.options.get(entry),
        { contents: generated, filePath: chunkEntry },
        job,
      )
      if (postGenerated) {
        generated = postGenerated.contents
      }
    }
    return {
      contents: generated,
    }
  }
  async generateChunk(chunk: Chunk, job: Job): Promise<ChunkGenerated> {
    let result
    if (chunk.type === 'file') {
      const generated = await this.generateFileChunk(chunk, job)
      result = {
        contents: generated.contents,
        sourceMap: null,
      }
    } else {
      const generated = await this.generateSimpleChunk(chunk, job)
      result = {
        contents: Buffer.from(generated.contents),
        sourceMap: generated.sourceMap,
      }
    }
    return {
      chunk,
      generated: result,
    }
  }
  async processFileTree(resolved: string, job: Job, forcedOverwite: boolean, tickCallback: TickCallback): Promise<void> {
    const oldFile = job.files.get(resolved)
    const lockKey = getLockKeyForFile(resolved)
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

    const lockKey = getLockKeyForChunk(chunk)
    const oldChunk = job.getSimilarChunk(chunk)
    if (job.locks.has(lockKey)) {
      return
    }
    if (oldChunk && !forcedOverwite) {
      return
    }
    job.locks.add(lockKey)
    try {
      job.upsertChunk(chunk)
      await this.processFileTree(entry, job, forcedOverwite, tickCallback)
    } catch (error) {
      if (oldChunk) {
        job.upsertChunk(chunk)
      } else {
        job.deleteChunk(chunk)
      }
      throw error
    } finally {
      job.locks.delete(lockKey)
    }
  }
  async transformJob(job: Job, cloneJob: boolean = true): Promise<Job> {
    let currentJob = job

    const jobTransformers = this.context.components.getJobTransformers()
    if (jobTransformers.length) {
      if (cloneJob) {
        currentJob = job.clone()
      }
      for (const entry of jobTransformers) {
        const transformed = await entry.callback(this.context, this.context.options.get(entry), currentJob)
        if (transformed) {
          currentJob = transformed.job
        }
      }
    }

    return currentJob
  }
  async build(): Promise<Array<ChunkGenerated>> {
    let job = new Job()
    const chunks = this.context.config.entry.map(async entry =>
      this.context.getSimpleChunk(await this.context.resolveSimple(entry), []),
    )
    await pMap(chunks, chunk =>
      this.processChunk(chunk, job, false, function() {
        /* No Op */
      }),
    )
    job = await this.transformJob(job)
    return pMap(job.chunks, chunk => this.generateChunk(chunk, job))
  }
  async write(generated: Array<ChunkGenerated>): Promise<{ [string]: { outputPath: string, sourceMapPath: string } }> {
    const outputConfig = this.context.config.output

    invariant(outputConfig && typeof outputConfig === 'object', 'Pundle#write expects config.output to be defined')

    const outputPaths = {}
    await pMap(generated, async (entry: ChunkGenerated) => {
      const outputPath = Helpers.getChunkFilePath(entry.chunk, outputConfig.template)
      const sourceMapPath = outputConfig.sourceMapTemplate
        ? Helpers.getChunkFilePath(entry.chunk, outputConfig.sourceMapTemplate)
        : null

      const resolved = path.resolve(outputConfig.rootDirectory, outputPath)
      let resolvedSourceMapPath = sourceMapPath
      if (resolvedSourceMapPath && resolvedSourceMapPath !== 'inline') {
        resolvedSourceMapPath = path.resolve(outputConfig.rootDirectory, resolvedSourceMapPath)
      }

      let contentsToWrite = Buffer.from(entry.generated.contents)
      if (resolvedSourceMapPath && entry.generated.sourceMap) {
        const type = entry.chunk.format === '.css' ? 'css' : 'js'
        let bottomLine

        if (resolvedSourceMapPath === 'inline') {
          bottomLine = sourceMapToComment(entry.generated.sourceMap, { type })
        } else {
          const bottomContents = `sourceMappingURL=${path.relative(path.dirname(resolved), resolvedSourceMapPath)}`
          bottomLine = type === 'css' ? `/*# ${bottomContents} */` : `//# ${bottomContents}`
        }
        bottomLine = `\n${bottomLine}`

        contentsToWrite = Buffer.concat([contentsToWrite, Buffer.from(bottomLine, 'utf8')])
      }
      invariant(
        !outputPaths[entry.chunk.label],
        'More than one outputs would use the same path. Try using some variables in output templates',
      )
      outputPaths[entry.chunk.label] = {
        outputPath: resolved,
        sourceMapPath: resolvedSourceMapPath,
      }

      await pfs.writeFileAsync(resolved, contentsToWrite)
      if (resolvedSourceMapPath && resolvedSourceMapPath !== 'inline' && entry.generated.sourceMap) {
        await pfs.writeFileAsync(resolvedSourceMapPath, JSON.stringify(entry.generated.sourceMap))
      }
    })
    console.log(outputPaths)

    return outputPaths
  }
}
