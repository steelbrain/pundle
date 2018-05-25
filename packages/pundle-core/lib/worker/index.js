// @flow

import fs from 'sb-fs'
import pReduce from 'p-reduce'
import mergeSourceMap from 'merge-source-map'
import {
  getFileName,
  getFileImportHash,
  type Chunk,
  type ImportResolved,
  type ImportRequest,
  type WorkerProcessResult,
  type ComponentFileResolverResult,
} from 'pundle-api'
import type { Config } from 'pundle-core-load-config'
import type Communication from 'sb-communication'

import type { RunOptions, WorkerType } from '../types'

export default class Worker {
  type: WorkerType
  config: Config
  options: RunOptions
  bridge: Communication

  constructor(type: WorkerType, config: Config, options: RunOptions, bridge: Communication) {
    this.type = type
    this.config = config
    this.options = options
    this.bridge = bridge
  }
  async resolve({ request, requestFile, ignoredResolvers }: ImportRequest): Promise<ComponentFileResolverResult> {
    const resolvers = this.config.components.filter(c => c.type === 'file-resolver')
    const allowedResolvers = resolvers.filter(c => !ignoredResolvers.includes(c.name))

    if (!resolvers.length) {
      throw new Error('No resolvers have been configured')
    }
    if (!allowedResolvers.length) {
      throw new Error('All resolvers have been excluded by config')
    }

    const result = await pReduce(
      allowedResolvers,
      async (payload, resolver) => {
        const response = await resolver.callback(payload, { rootDirectory: this.config.rootDirectory })
        // TODO: Validation?
        return response || payload
      },
      {
        request,
        requestFile,
        ignoredResolvers,
        format: null,
        resolved: null,
        resolvedRoot: null,
      },
    )

    if (!result.resolved) {
      throw new Error(`Unable to resolve '${request}' from '${requestFile || this.config.rootDirectory}'`)
    }
    if (!result.format) {
      throw new Error(`Resolved request '${request}' to '${result.resolved}' but format was not determined`)
    }
    return result
  }
  async resolveFromMaster(payload: ImportRequest) {
    return this.bridge.send('resolve', payload)
  }
  async process({ filePath, format }: ImportResolved): Promise<WorkerProcessResult> {
    const contents = await fs.readFile(filePath)

    const fileChunks = new Map()
    const fileImports = new Map()

    const transformers = this.config.components.filter(c => c.type === 'file-transformer')
    const transformed = await pReduce(
      transformers,
      async (payload, transformer) => {
        const response = await transformer.callback(
          {
            ...payload,
            format,
            filePath,
          },
          {
            getFileName: (chunk: Chunk): string | false => getFileName(this.config.output.formats, chunk),
            resolve: async request => {
              const resolved = await this.resolveFromMaster({
                request,
                requestFile: filePath,
                ignoredResolvers: [],
              })
              if (resolved.format !== format) {
                // TODO: Note this somewhere but when we import a file
                // it's format is discarded and current chunk format is used
                // This allows for requiring css files in JS depsite them
                // being resolved as css. Or allow their "module" JS counterparts
                // to be exposed
                resolved.format = format
              }
              return { filePath: resolved.resolved, format: resolved.format }
            },
            addImport(fileImport) {
              // TODO: Validation
              fileImports.set(getFileImportHash(fileImport.filePath, fileImport.format), fileImport)
            },
            addChunk(chunk) {
              // TODO: Validation
              fileChunks.set(chunk.id, chunk)
            },
          },
        )
        if (response) {
          // TODO: Validation?
          let newSourceMap = null
          if (response.sourceMap && !payload.sourceMap) {
            newSourceMap = response.sourceMap
          } else if (response.sourceMap && payload.sourceMap) {
            newSourceMap = mergeSourceMap(payload.sourceMap, response.sourceMap)
          }
          return {
            ...response,
            sourceMap: newSourceMap,
          }
        }
        return payload
      },
      {
        contents,
        sourceMap: null,
      },
    )

    return {
      id: getFileImportHash(filePath, format),
      format,
      filePath,
      imports: Array.from(fileImports.values()),
      chunks: Array.from(fileChunks.values()),
      // FIXME: Currently we don't have config on both sides to send buffers through process.send(), it shows up
      // as an orindary object instead of a Buffer
      contents: typeof transformed.contents === 'string' ? transformed.contents : transformed.contents.toString(),
      sourceMap: transformed.sourceMap,
    }
  }
}
