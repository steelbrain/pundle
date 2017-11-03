// @flow

import mergeSourceMap from 'merge-source-map'
import type { Chunk, Import } from './types'

export default class File {
  fileName: string
  filePath: string
  lastModified: number

  contents: string
  sourceContents: string
  sourceMap: ?Object

  // Private props
  $chunks: Array<Chunk>
  $imports: Array<Import>

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
    this.$chunks = []
    this.$imports = []
  }
  mergeTransformation(contents: string, sourceMap: ?Object): void {
    if (this.sourceMap && !sourceMap) {
      this.sourceMap = null
    } else if (!this.sourceMap && sourceMap) {
      this.sourceMap = sourceMap
    } else if (this.sourceMap && sourceMap) {
      this.sourceMap = mergeSourceMap(this.sourceMap, sourceMap)
    }
    this.contents = contents
  }
  addChunk(entry: Chunk): void {
    // TODO: Dedupe
    this.$chunks.push(entry)
  }
  addImport(entry: Import): void {
    this.$imports.push(entry)
  }
}
