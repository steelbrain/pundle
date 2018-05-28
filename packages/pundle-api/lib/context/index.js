// @flow

import mergeSourceMap from 'merge-source-map'
import type { Config } from 'pundle-core-load-config'

import Job from '../job'
import PundleError from '../pundle-error'
import { getFileName, getFileKey } from '../common'
import type {
  Chunk,
  Component,
  ComponentType,
  ImportRequest,
  ImportResolved,
  TransformRequest,
  TransformResult,
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
  getFileName(payload: Chunk) {
    return getFileName(this.config.output.formats, payload)
  }
  async invokeFileResolvers({ request, requestFile, ignoredResolvers }: ImportRequest): Promise<ImportResolved> {
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
  async invokeFileTransformers({ filePath, format, contents, resolve }: TransformRequest): Promise<TransformResult> {
    const fileChunks = new Map()
    const fileImports = new Map()

    const transformers = this.getComponents('file-transformer')
    let transformed: { contents: string | Buffer, sourceMap: ?Object } = { contents, sourceMap: null }

    for (const transformer of transformers) {
      const result = await transformer.callback({
        file: { ...transformed, filePath, format },
        context: this,
        resolve,
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
          fileChunks.set(chunk.id, chunk)
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
      if (result.sourceMap && !transformed.sourceMap) {
        newSourceMap = result.sourceMap
      } else if (result.sourceMap && transformed.sourceMap) {
        newSourceMap = mergeSourceMap(transformed.sourceMap, result.sourceMap)
      }
      transformed = { sourceMap: newSourceMap, contents: result.contents }
    }

    return {
      imports: Array.from(fileImports.values()),
      chunks: Array.from(fileChunks.values()),
      contents: transformed.contents,
      sourceMap: transformed.sourceMap,
    }
  }
  async invokeJobTransformer({ job }: { job: Job }): Promise<Job> {
    let transformed = job

    const transformers = this.getComponents('job-transformer')
    for (const transformer of transformers) {
      const result = await transformer.callback({
        context: this,
        job: transformed,
      })
      if (!result) continue
      if (typeof result !== 'object' || typeof result.job !== 'object' || !(result.job instanceof Job)) {
        throw new PundleError(
          'WORK',
          'TRANSFORM_FAILED',
          `Job Transformer '${transformer.name}' returned invalid results: job must be valid`,
        )
      }
      transformed = result.job
    }

    return job
  }
}
