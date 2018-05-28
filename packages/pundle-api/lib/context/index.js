// @flow

import mergeSourceMap from 'merge-source-map'
import type { Config } from 'pundle-core-load-config'

import PundleError from '../pundle-error'
import { getFileName, getFileImportHash } from '../common'
import type {
  Component,
  ComponentType,
  ImportRequest,
  ImportResolved,
  TransformRequest,
  TransformResult,
  GetFileNamePayload,
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
  getFileName(payload: GetFileNamePayload) {
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
        if (error && error.type === 'ValidationError') {
          throw new PundleError(
            'WORK',
            'RESOLVE_FAILED',
            `Resolver '${resolver.name}' returned invalid result: ${error.errors.join(', ')}`,
          )
        }
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
        addImport(fileImport) {
          // TODO: Validation
          fileImports.set(getFileImportHash(fileImport.filePath, fileImport.format), fileImport)
        },
        addChunk(chunk) {
          // TODO: Validation
          fileChunks.set(chunk.id, chunk)
        },
      })
      if (!result) continue

      try {
        await validators.transformed(result)
      } catch (error) {
        if (error && error.type === 'ValidationError') {
          throw new PundleError(
            'WORK',
            'RESOLVE_FAILED',
            `Transformer '${transformer.name}' returned invalid result: ${error.errors.join(', ')}`,
          )
        }
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
}
