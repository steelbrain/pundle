// @flow

import type { Chunk, Import } from './types'

export default class File {
  fileName: string
  filePath: string
  lastModified: number

  contents: string
  sourceContents: string
  sourceMap: ?Object

  imports: Array<Import>
  chunks: Array<Chunk>

  constructor({
    fileName,
    filePath,
    lastModified,
    contents,
  }: {
    fileName: string,
    filePath: string,
    lastModified: number,
    contents: string,
  }) {
    this.fileName = fileName
    this.filePath = filePath
    this.lastModified = lastModified
    this.contents = contents

    this.sourceContents = contents
    this.sourceMap = null
    this.imports = []
    this.chunks = []
  }
}
