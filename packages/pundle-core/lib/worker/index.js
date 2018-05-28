// @flow

import fs from 'sb-fs'
import pReduce from 'p-reduce'
import mergeSourceMap from 'merge-source-map'
import {
  getFileImportHash,
  type Context,
  type ImportResolved,
  type ImportRequest,
  type ImportProcessed,
  type ComponentFileResolverResult,
} from 'pundle-api'
import type Communication from 'sb-communication'

export default class Worker {
  bridge: Communication
  context: Context

  constructor(context: Context, bridge: Communication) {
    this.context = context
    this.bridge = bridge
  }
  async resolve({ request, requestFile, ignoredResolvers }: ImportRequest): Promise<ComponentFileResolverResult> {
    const resolvers = this.context.getComponents('file-resolver')
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
        // TODO: We only invoke first resolver now, make necessary changes
        if (payload) return payload

        const response = await resolver.callback({
          request,
          requestFile,
          context: this.context,
        })
        // TODO: Validation?
        return response || payload
      },
      null,
    )

    if (!result.resolved) {
      throw new Error(`Unable to resolve '${request}' from '${requestFile || this.context.config.rootDirectory}'`)
    }
    if (!result.format) {
      throw new Error(`Resolved request '${request}' to '${result.resolved}' but format was not determined`)
    }
    return result
  }
  async resolveFromMaster(payload: ImportRequest) {
    return this.bridge.send('resolve', payload)
  }
  async process({ filePath, format }: ImportResolved): Promise<ImportProcessed> {
    const fileChunks = new Map()
    const fileImports = new Map()

    const transformers = this.context.getComponents('file-transformer')
    const transformed = await pReduce(
      transformers,
      async ({ contents, sourceMap }, transformer) => {
        const response = await transformer.callback({
          file: { filePath, format, contents, sourceMap },
          context: this.context,
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
        })
        if (response) {
          // TODO: Validation?
          let newSourceMap = null
          if (response.sourceMap && !sourceMap) {
            newSourceMap = response.sourceMap
          } else if (response.sourceMap && sourceMap) {
            newSourceMap = mergeSourceMap(sourceMap, response.sourceMap)
          }
          return {
            ...response,
            sourceMap: newSourceMap,
          }
        }
        return { contents, sourceMap }
      },
      {
        contents: await fs.readFile(filePath),
        sourceMap: null,
      },
    )

    return {
      id: getFileImportHash(filePath, format),
      format,
      filePath,
      imports: Array.from(fileImports.values()),
      chunks: Array.from(fileChunks.values()),
      contents: transformed.contents,
      sourceMap: transformed.sourceMap,
    }
  }
}
