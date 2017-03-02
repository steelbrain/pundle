/* @flow */

import invariant from 'assert'
import type { File } from 'pundle-api/types'

export default class Chunk {
  name: string;
  entry: Set<string>;
  files: Set<string>;
  filesState: Map<string, File>;
  filesLocked: Set<string>;

  constructor(name: string, entry: Array<string>) {
    this.name = name
    this.entry = new Set(entry)
    this.files = new Set()
    this.filesState = new Map()
    this.filesLocked = new Set()
  }
  lock(filePath: string): this {
    this.filesLocked.add(filePath)
    return this
  }
  unlock(filePath: string): this {
    this.filesLocked.delete(filePath)
    return this
  }
  isLocked(filePath: string): boolean {
    return this.filesLocked.has(filePath)
  }
  addFile(filePath: string): this {
    this.files.add(filePath)
    return this
  }
  getFiles(): Array<string> {
    return Array.from(this.files)
  }
  deleteFile(filePath: string): this {
    this.files.delete(filePath)
    return this
  }
  setFileState(filePath: string, file: File): this {
    this.filesState.set(filePath, file)
    return this
  }
  getFileState(filePath: string): File {
    const file = this.filesState.get(filePath)
    invariant(file, `${filePath} not found in files`)
    return file
  }
  deleteFileState(filePath: string): this {
    this.filesState.delete(filePath)
    return this
  }
}
