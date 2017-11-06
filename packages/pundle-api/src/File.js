// @flow

import fs from 'fs'
import path from 'path'
import promisify from 'sb-promisify'
import mergeSourceMap from 'merge-source-map'
import type { Chunk, Import } from './types'

const asyncStat = promisify(fs.stat)
const asyncReadFile = promisify(fs.readFile)
const lastModifiedFromStats = stats => stats.mtime.getTime() / 1000

export default class File {
  fileName: string
  // ^ relative to the root directory
  filePath: string
  // ^ absolute file system path
  lastModified: number

  contents: string
  sourceContents: string
  sourceMap: ?Object

  // Don't push to these directly, ever
  chunks: Array<Chunk>
  imports: Array<Import>

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
    this.chunks = []
    this.imports = []
  }
  async hasChanged(): Promise<boolean> {
    let stats
    try {
      stats = await asyncStat(this.filePath)
    } catch (_) {
      return true
    }
    return lastModifiedFromStats(stats) !== this.lastModified
  }
  mergeTransformation(contents: string, sourceMap: ?Object): void {
    if (this.sourceMap && !sourceMap) {
      this.sourceMap = null
    } else if (!this.sourceMap && sourceMap) {
      this.sourceMap = sourceMap
    } else if (this.sourceMap && sourceMap) {
      this.sourceMap = mergeSourceMap(this.sourceMap, sourceMap)
    }
    if (this.sourceMap) {
      this.sourceMap.sources = [this.fileName]
      this.sourceMap.sourcesContent = [this.sourceContents]
    }
    this.contents = contents
  }
  addChunk(entry: Chunk): void {
    // TODO: Dedupe
    this.chunks.push(entry)
  }
  addImport(entry: Import): void {
    // TODO: Dedupe
    this.imports.push(entry)
  }
  static async get(fileName: string, rootDirectory: string): Promise<File> {
    const resolved = path.resolve(rootDirectory, fileName)

    const stats = await asyncStat(resolved)
    const contents = await asyncReadFile(resolved, 'utf8')
    return new File({
      fileName: path.relative(rootDirectory, resolved),
      filePath: resolved,
      lastModified: lastModifiedFromStats(stats),

      contents,
    })
  }
}
