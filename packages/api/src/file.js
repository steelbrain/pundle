/* @flow */

import invariant from 'assert'
import mergeSourceMap from 'merge-source-map'
import type { FileChunk, FileImport } from '../types'

const FEATURES = {
  ES_IMPORT: 'ES_IMPORT',
  ES_EXPORT: 'ES_EXPORT',
  CJS_IMPORT: 'CJS_IMPORT',
  CJS_EXPORT: 'CJS_EXPORT',
  NODE_TIMER: 'NODE_TIMER',
  NODE_BUFFER: 'NODE_BUFFER',
  NODE_PROCESS: 'NODE_PROCESS',
}

const features = new Set(Object.values(FEATURES))

class File {
  static $pundle = true;

  filePath: string;
  contents: Buffer | string;
  sourceMap: ?Object;
  lastModified: Date;
  featuresUsed: Set<string>;
  sourceContents: Buffer;
  dependencyChunks: Array<FileChunk>;
  dependencyImports: Array<FileImport>;

  constructor(filePath: string, contents: Buffer, lastModified: Date) {
    this.filePath = filePath
    this.contents = contents
    this.sourceMap = null
    this.lastModified = lastModified
    this.featuresUsed = new Set()
    this.sourceContents = contents
    this.dependencyChunks = []
    this.dependencyImports = []
  }
  useFeature(feature: string): void {
    if (!features.has(feature)) {
      throw new Error(`Unknown feature: ${feature}`)
    }
    this.featuresUsed.add(feature)
  }
  getFilePath(): string {
    return this.filePath
  }
  getSource(): Buffer {
    return this.sourceContents
  }
  getContents(): string {
    return this.contents.toString()
  }
  getSourceMap(): ?Object {
    return this.sourceMap
  }
  getLastModified(): Date {
    return this.lastModified
  }
  getChunks(): Array<FileChunk> {
    return this.dependencyChunks
  }
  setChunks(chunks: Array<FileChunk>): void {
    if (!Array.isArray(chunks)) {
      throw new Error('Chunks must be an array')
    }
    this.dependencyChunks = chunks
  }
  addChunk(chunk: FileChunk): void {
    invariant(chunk && typeof chunk === 'object', 'chunk must be a valid object')

    this.dependencyChunks.push(chunk)
  }
  removeChunk(chunk: FileChunk): void {
    invariant(chunk && typeof chunk === 'object', 'chunk must be a valid object')

    const index = this.dependencyChunks.indexOf(chunk)
    if (index !== -1) {
      this.dependencyChunks.splice(index, 1)
    }
  }
  getImports(): Array<FileImport> {
    return this.dependencyImports
  }
  setImports(imports: Array<FileImport>): void {
    invariant(Array.isArray(imports), 'Imports must be an array')

    this.dependencyImports = imports
  }
  addImport(entry: FileImport): void {
    this.dependencyImports.push(entry)
  }
  removeImport(fileImport: FileImport): void {
    invariant(fileImport && typeof fileImport === 'object', 'chunk must be a valid object')

    const index = this.dependencyImports.indexOf(fileImport)
    if (index !== -1) {
      this.dependencyImports.splice(index, 1)
    }
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
}

export {
  File,
  FEATURES,
}

export default File
