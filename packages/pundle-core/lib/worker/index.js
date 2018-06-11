// @flow

import fs from 'sb-fs'
import type {
  PundleWorker,
  Context,
  ImportResolved,
  ImportRequest,
  ImportTransformed,
  ChunkGenerated,
  ComponentChunkTransformerResult,
} from 'pundle-api'
import type Communication from 'sb-communication'

export default class Worker implements PundleWorker {
  bridge: Communication
  context: Context

  constructor(context: Context, bridge: Communication) {
    this.context = context
    this.bridge = bridge
  }
  async resolveLocally(request: ImportRequest): Promise<ImportResolved> {
    return this.context.invokeFileResolvers(this, request)
  }
  async transformChunkGenerated(chunkGenerated: ChunkGenerated): Promise<ComponentChunkTransformerResult> {
    const chunk = { ...chunkGenerated }
    if (typeof chunk.contents === 'object' && chunk.contents) {
      chunk.contents = Buffer.from(chunk.contents)
    }
    if (chunk.sourceMap && typeof chunk.sourceMap.contents === 'object' && chunk.sourceMap.contents) {
      // $FlowFixMe deep prop access paranoia?
      chunk.sourceMap.contents = Buffer.from(chunk.sourceMap.contents)
    }
    return this.context.invokeChunkTransformers(this, chunk)
  }
  // PundleWorker methods below
  async resolve(payload: ImportRequest) {
    return this.bridge.send('resolve', payload)
  }
  async transformFile({ filePath, format }: ImportResolved): Promise<ImportTransformed> {
    const transformed = await this.context.invokeFileTransformers(this, {
      format,
      filePath,
      contents: await fs.readFile(filePath),
    })

    return {
      format,
      filePath,
      ...transformed,
    }
  }
  async report(issue: $FlowFixMe): Promise<void> {
    await this.context.invokeIssueReporters(issue)
  }
}
