/* @flow */

import type { File, FileImport, FileChunk } from 'pundle-api/types'

export default class Chunk {
  name: string;
  files: Map<string, File>;
  entry: ?FileImport;
  imports: Set<FileImport>;

  constructor(name: string, entry: ?FileImport, imports: Array<FileImport>, files: Map<string, File>) {
    this.name = name
    this.files = files
    this.entry = entry
    this.imports = new Set(imports)
  }
  getName(): string {
    return this.name
  }
  getEntry(): ?FileImport {
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
  getImports(): Array<FileImport> {
    return Array.from(this.imports)
  }
  static get(fileChunk: FileChunk, files: Map<string, ?File>): Chunk {
    const chunkFiles = new Map()

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
    if (fileChunk.entry) {
      iterate(fileChunk.entry)
    }
    fileChunk.imports.forEach(entry => iterate(entry))

    return new Chunk(fileChunk.name, fileChunk.entry, fileChunk.imports, chunkFiles)
  }
}
