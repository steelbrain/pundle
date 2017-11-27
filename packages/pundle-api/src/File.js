// @flow
/* eslint-disable no-underscore-dangle */

import fs from 'fs'
import path from 'path'
import invariant from 'assert'
import promisify from 'sb-promisify'
import mergeSourceMap from 'merge-source-map'

import { normalizeFileName, getLockKeyForChunk, getLockKeyForFile } from './common'
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
  convertToString: boolean

  _contents: string
  sourceContents: Buffer
  sourceMap: ?Object

  // Don't push to these directly, ever
  chunks: Array<Chunk>
  imports: Array<Import>

  constructor(
    {
      fileName,
      filePath,
      lastModified,
      contents,
    }: {
      fileName: string,
      filePath: string,
      lastModified: number,
      contents: Buffer,
    },
    convertToString: boolean,
  ) {
    this.fileName = fileName
    this.filePath = filePath
    this.lastModified = lastModified
    this.convertToString = convertToString
    if (convertToString) {
      this.contents = contents.toString()
    }

    this.sourceContents = contents
    this.sourceMap = null
    this.chunks = []
    this.imports = []
  }
  get contents(): string {
    invariant(this.convertToString, 'Cannot access contents on a raw file')
    return this._contents
  }
  set contents(newContents: string): void {
    invariant(this.convertToString, 'Cannot set contents on a raw file')
    this._contents = newContents
  }
  clone(): File {
    const newFile = new File(
      {
        fileName: this.fileName,
        filePath: this.filePath,
        lastModified: this.lastModified,
        contents: this.sourceContents,
      },
      this.convertToString,
    )
    if (this.convertToString) {
      newFile.contents = this.contents
    }
    newFile.sourceMap = this.sourceMap
    newFile.chunks = this.chunks.slice()
    newFile.imports = this.imports.slice()
    return newFile
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

    const newSourceMap = this.sourceMap
    if (newSourceMap) {
      newSourceMap.sources = [this.fileName]
      newSourceMap.sourcesContent = [this.sourceContents.toString('utf8')]
    }
    this.contents = contents
  }
  addChunk(chunk: Chunk): void {
    const lockKey = getLockKeyForChunk(chunk)
    if (!this.chunks.find(entry => getLockKeyForChunk(entry) === lockKey)) {
      this.chunks.push(chunk)
    }
  }
  addImport(file: Import): void {
    const lockKey = getLockKeyForFile(file)
    if (!this.imports.find(entry => getLockKeyForFile(entry) === lockKey)) {
      this.imports.push(file)
    }
  }
  static async get(fileName: string, rootDirectory: string, convertToString: boolean): Promise<File> {
    const resolved = path.resolve(rootDirectory, fileName)

    const stats = await asyncStat(resolved)
    const contents = await asyncReadFile(resolved)
    return new File(
      {
        fileName: normalizeFileName(path.relative(rootDirectory, resolved)),
        filePath: resolved,
        lastModified: lastModifiedFromStats(stats),

        contents,
      },
      convertToString,
    )
  }
}
