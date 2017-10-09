// @flow

import pMap from 'p-map'
import type { Context } from 'pundle-api'

type Import = {}
type Chunk = {}

type File = {
  sourceContents: string,
  filePath: string,
  generatedContents: string,

  ast: any,
  imports: Array<Import>,
  chunks: Array<Chunk>,
}

export default class Compilation {
  context: Context

  constructor(context: Context) {
    this.context = context
  }
  async build(): Promise<void> {
    const files: Map<string, File> = new Map()
    const resolved = await pMap(this.context.config.entry, file =>
      this.context.resolveSimple(file),
    )
    console.log('resolved', resolved, files)
  }
}
