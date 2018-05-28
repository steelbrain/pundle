// @flow

import fs from 'sb-fs'
import pReduce from 'p-reduce'
import mergeSourceMap from 'merge-source-map'
import { getFileImportHash, type Context, type ImportResolved, type ImportRequest, type ImportProcessed } from 'pundle-api'
import type Communication from 'sb-communication'

export default class Worker {
  bridge: Communication
  context: Context

  constructor(context: Context, bridge: Communication) {
    this.context = context
    this.bridge = bridge
  }
  async resolve(request: ImportRequest): Promise<ImportResolved> {
    return this.context.invokeFileResolvers(request)
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
            return { filePath: resolved.filePath, format: resolved.format }
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
