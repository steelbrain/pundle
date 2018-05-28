// @flow

import fs from 'sb-fs'
import { type Context, type ImportResolved, type ImportRequest, type ImportProcessed } from 'pundle-api'
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
    const transformed = await this.context.invokeFileTransformers({
      filePath,
      format,
      contents: await fs.readFile(filePath),
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
    })

    return {
      format,
      filePath,
      ...transformed,
    }
  }
}
