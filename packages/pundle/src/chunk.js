/* @flow */

import type { File, FileImport, FileChunk } from 'pundle-api/types'

export default class Chunk {
  id: number;
  files: Map<string, File>;
  entry: Array<FileImport>;

  constructor(id: number, entry: Array<FileImport>, files: Map<string, File>) {
    this.id = id
    this.files = files
    this.entry = entry
  }
  getId(): number {
    return this.id
  }
  getEntry(): Array<FileImport> {
    return this.entry
  }
  getFiles(): Array<File> {
    return Array.from(this.files.values())
  }
  hasFile(filePath: string): boolean {
    return this.files.has(filePath)
  }
  addFile(filePath: string, file: File): void {
    this.files.set(filePath, file)
  }
  deleteFile(filePath: string): void {
    this.files.delete(filePath)
  }
  static get(fileChunk: FileChunk, files: Map<string, File>, chunkOptions: Object = {}): Chunk {
    let chunkFiles = new Map()

    function iterate(fileImport: FileImport) {
      const filePath = fileImport.resolved
      if (!filePath) {
        throw new Error(`${fileImport.request} was not resolved from ${fileImport.from || 'Project root'}`)
      }
      if (chunkFiles.has(filePath)) {
        return
      }
      const file = files.get(filePath)
      if (!file) {
        throw new Error(`${filePath} was not processed`)
      }
      chunkFiles.set(filePath, file)
      file.imports.forEach(entry => iterate(entry))
    }

    if (chunkOptions.allFiles) {
      chunkFiles = files
    } else {
      fileChunk.entry.forEach(entry => iterate(entry))
      fileChunk.imports.forEach(entry => iterate(entry))
    }

    return new Chunk(fileChunk.id, fileChunk.entry, chunkFiles)
  }
}
