/* @flow */

import invariant from 'assert'
import type { File, FileImport } from '../types'

export default class FileChunk {
  id: number;
  label: ?string;
  files: Map<string, File>;
  entries: Array<FileImport>;
  imports: Array<FileImport>;

  constructor(id: number, label: ?string) {
    invariant(id && typeof id === 'number', 'id must be a string')
    invariant(!label || typeof label === 'string', 'label must be a string')

    this.id = id
    this.label = label || null
    this.files = new Map()
    this.entries = []
    this.imports = []
  }
  getId(): number {
    return this.id
  }
  getLabel(): ?string {
    return this.label
  }
  getIdOrLabel(): string {
    return this.label || this.id.toString()
  }
  setFile(filePath: string, file: File): void {
    invariant(filePath && typeof filePath === 'string', 'filePath must be a string')
    invariant(file && typeof file === 'object' && file.constructor.$pundle, 'file must be a valid Pundle File')

    this.files.set(filePath, file)
  }
  setFiles(files: Map<string, File>): void {
    invariant(files && typeof files.forEach === 'function' && typeof files.keys === 'function', 'files must be a valid map')

    files.forEach((file, filePath) => {
      this.setFile(filePath, file)
    })
  }
  getFile(filePath: string): ?File {
    return this.files.get(filePath)
  }
  getFiles(): Map<string, File> {
    return this.files
  }
  clearFiles(): void {
    this.files.clear()
  }
  addEntry(fileEntry: FileImport): void {
    invariant(fileEntry && typeof fileEntry === 'object', 'entry must be a valid object')

    this.entries.push(fileEntry)
  }
  removeEntry(fileEntry: FileImport): void {
    invariant(fileEntry && typeof fileEntry === 'object', 'entry must be a valid object')

    const index = this.entries.indexOf(fileEntry)
    if (index !== -1) {
      this.entries.splice(index, 1)
    }
  }
  getEntries(): Array<FileImport> {
    return this.entries
  }
  clearEntries(): void {
    this.entries = []
  }
  addImport(fileImport: FileImport): void {
    invariant(fileImport && typeof fileImport === 'object', 'import must be a valid object')

    this.imports.push(fileImport)
  }
  removeImport(fileImport: FileImport): void {
    invariant(fileImport && typeof fileImport === 'object', 'import must be a valid object')

    const index = this.imports.indexOf(fileImport)
    if (index !== -1) {
      this.imports.splice(index, 1)
    }
  }
  getImports(): Array<FileImport> {
    return this.imports
  }
  clearImports(): void {
    this.imports = []
  }
}
