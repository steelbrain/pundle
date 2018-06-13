// @flow

import pMap from 'p-map'
import mergeSourceMap from 'merge-source-map'
import type { Config } from 'pundle-core-load-config'

import Job from '../job'
import PundleError from '../pundle-error'
import { getPublicPath, getFileKey, getChunkKey } from '../common'
import type {
  Loc,
  Chunk,
  Component,
  PundleWorker,
  ComponentType,
  ImportRequest,
  ImportResolved,
  TransformRequest,
  TransformResult,
  ChunkGenerated,
  ChunksGenerated,
  ComponentChunkTransformerResult,
} from '../types'
import * as validators from './validators'

export default class Context {
  config: Config
  configInline: Object
  configFileName: string
  configLoadFile: boolean
  directory: string

  constructor({
    config,
    configInline,
    configFileName,
    configLoadFile,
    directory,
  }: {|
    config: Config,
    configInline: Object,
    configFileName: string,
    configLoadFile: boolean,
    directory: string,
  |}) {
    this.config = config
    this.configInline = configInline
    this.configFileName = configFileName
    this.configLoadFile = configLoadFile
    this.directory = directory
  }
  serialize() {
    return {
      configInline: this.configInline,
      configFileName: this.configFileName,
      configLoadFile: this.configLoadFile,
      directory: this.directory,
    }
  }
  getComponents<T1: ComponentType, T2>(type: T1): Array<Component<T1, T2>> {
    return this.config.components.filter(c => c.type === type)
  }
  getPublicPath(payload: Chunk) {
    return getPublicPath(this.config.output.formats, payload)
  }
  async invokeFileResolvers(
    worker: PundleWorker,
    { request, requestFile, ignoredResolvers }: ImportRequest,
  ): Promise<ImportResolved> {
    const allResolvers = this.getComponents('file-resolver')
    const resolvers = allResolvers.filter(c => !ignoredResolvers.includes(c.name))

    if (!allResolvers.length) {
      throw new PundleError('WORK', 'RESOLVE_FAILED', 'No file resolvers configured', requestFile)
    }
    if (!resolvers.length) {
      throw new PundleError('WORK', 'RESOLVE_FAILED', 'All resolvers were ignored', requestFile)
    }

    let resolved

    for (const resolver of resolvers) {
      resolved = await resolver.callback({
        context: this,
        request,
        requestFile,
        ignoredResolvers,
        worker,
      })
      if (!resolved) continue

      try {
        await validators.resolved(resolved)
      } catch (error) {
        if (error && error.name === 'ValidationError') {
          throw new PundleError(
            'WORK',
            'RESOLVE_FAILED',
            `Resolver '${resolver.name}' returned invalid result: ${error.errors.join(', ')}`,
          )
        }
        throw error
      }
    }

    if (!resolved) {
      throw new PundleError('WORK', 'RESOLVE_FAILED', `Unable to resolve '${request}'`, requestFile)
    }
    return resolved
  }
  async invokeFileTransformers(
    worker: PundleWorker,
    { filePath, format, contents }: TransformRequest,
  ): Promise<TransformResult> {
    const fileChunks = new Map()
    const fileImports = new Map()

    const transformers = this.getComponents('file-transformer')
    let transformed: { contents: string | Buffer, sourceMap: ?Object | false } = { contents, sourceMap: null }

    for (const transformer of transformers) {
      const result = await transformer.callback({
        file: { ...transformed, filePath, format },
        context: this,
        worker,
        // TODO: Inject loc into errors?
        // eslint-disable-next-line no-unused-vars
        resolve(request: string, loc: ?Loc = null) {
          return worker.resolve({ request, requestFile: filePath, ignoredResolvers: [] }).then(resolved => ({
            ...resolved,
            format,
          }))
        },
        async addImport(fileImport) {
          try {
            await validators.resolved(fileImport)
          } catch (error) {
            if (error && error.name === 'ValidationError') {
              throw new PundleError(
                'WORK',
                'TRANSFORM_FAILED',
                `Cannot add invalid import in transformer '${transformer.name}': ${error.errors.join(', ')}`,
              )
            }
            throw error
          }
          fileImports.set(getFileKey(fileImport), fileImport)
        },
        async addChunk(chunk) {
          try {
            await validators.chunk(chunk)
          } catch (error) {
            if (error && error.name === 'ValidationError') {
              throw new PundleError(
                'WORK',
                'TRANSFORM_FAILED',
                `Cannot add invalid chunk in transformer '${transformer.name}': ${error.errors.join(', ')}`,
              )
            }
            throw error
          }
          fileChunks.set(getChunkKey(chunk), chunk)
        },
      })
      if (!result) continue

      try {
        await validators.transformed(result)
      } catch (error) {
        if (error && error.name === 'ValidationError') {
          throw new PundleError(
            'WORK',
            'RESOLVE_FAILED',
            `Transformer '${transformer.name}' returned invalid result: ${error.errors.join(', ')}`,
          )
        }
        throw error
      }

      let newSourceMap = null
      if (transformed.sourceMap === false) {
        newSourceMap = false
      } else if (result.sourceMap === false) {
        newSourceMap = false
      } else if (result.sourceMap && !transformed.sourceMap) {
        newSourceMap = result.sourceMap
      } else if (result.sourceMap && transformed.sourceMap) {
        newSourceMap = mergeSourceMap(transformed.sourceMap, result.sourceMap)
      }
      transformed = { sourceMap: newSourceMap, contents: result.contents }
    }

    if (transformed.sourceMap) {
      Object.assign(transformed.sourceMap, {
        sources: [filePath],
        sourcesContent: [typeof contents === 'string' ? contents : contents.toString()],
      })
    }

    return {
      imports: Array.from(fileImports.values()),
      chunks: Array.from(fileChunks.values()),
      contents: transformed.contents,
      sourceMap: transformed.sourceMap,
    }
  }
  async invokeJobTransformers(worker: PundleWorker, { job }: { job: Job }): Promise<Job> {
    let transformed = job

    const transformers = this.getComponents('job-transformer')
    for (const transformer of transformers) {
      const result = await transformer.callback({
        context: this,
        worker,
        job: transformed,
      })
      if (!result) continue
      if (typeof result !== 'object' || typeof result.job !== 'object' || !(result.job instanceof job.constructor)) {
        throw new PundleError(
          'WORK',
          'TRANSFORM_FAILED',
          `Job Transformer '${transformer.name}' returned invalid results: job must be valid`,
        )
      }
      transformed = result.job
    }

    return transformed
  }
  async invokeChunkGenerators(
    worker: PundleWorker,
    { job, chunks }: { job: Job, chunks: Array<Chunk> },
  ): Promise<ChunksGenerated> {
    const everything = []

    const generators = this.getComponents('chunk-generator')
    if (!generators.length) {
      throw new PundleError('WORK', 'GENERATE_FAILED', 'No chunk generators configured')
    }

    await pMap(chunks, async chunk => {
      let generated = null

      for (const generator of generators) {
        generated = await generator.callback({
          job,
          chunk,
          context: this,
          worker,
        })
        if (generated) {
          break
          // TODO: Validation
        }
      }

      if (!generated) {
        const ps = []
        if (chunk.entry) {
          ps.push(`with entry '${chunk.entry}'`)
        }
        if (chunk.label) {
          ps.push(`with label '${chunk.label}'`)
        }
        throw new PundleError(
          'WORK',
          'GENERATE_FAILED',
          `Chunk Generators refused to generate chunk of format '${chunk.format}'${ps ? ` ${ps.join(' ')}` : ''}`,
        )
      }

      everything.push({
        chunk,
        format: generated.format,
        contents: generated.contents,
        filePath: this.getPublicPath({ ...chunk, format: generated.format }),
        sourceMap: generated.sourceMap || null,
      })
    })

    return {
      directory: this.config.output.rootDirectory,
      outputs: everything,
    }
  }
  async invokeChunkTransformers(
    worker: PundleWorker,
    chunkGenerated: ChunkGenerated,
  ): Promise<ComponentChunkTransformerResult> {
    let transformedChunk = chunkGenerated.contents
    let transformedSourceMap = null

    const transformers = this.getComponents('chunk-transformer')
    for (const transformer of transformers) {
      const result = await transformer.callback({
        context: this,
        worker,
        ...chunkGenerated,
        contents: transformedChunk,
      })
      if (!result) continue
      if (
        typeof result !== 'object' ||
        !result ||
        !(typeof result.contents === 'string' || Buffer.isBuffer(result.contents))
      ) {
        throw new PundleError(
          'WORK',
          'TRANSFORM_FAILED',
          `Chunk Transformer '${transformer.name}' returned invalid results: result.contents must be valid string or buffer`,
        )
      }
      transformedChunk = result.contents
      if (result.sourceMap) {
        transformedSourceMap = result.sourceMap
      } else transformedSourceMap = null
    }

    return { contents: transformedChunk, sourceMap: transformedSourceMap }
  }
  async invokeIssueReporters(issue: any): Promise<void> {
    const issueReporters = this.getComponents('issue-reporter')

    if (!issueReporters.length) {
      console.error('No Issue Reporters found to report this issue:', issue)
      return
    }

    await pMap(issueReporters, issueReporter =>
      issueReporter.callback({
        issue,
        context: this,
      }),
    )
  }
}
