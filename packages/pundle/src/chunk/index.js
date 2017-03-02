/* @flow */

import invariant from 'assert'
import type { File } from 'pundle-api/types'

export default class Chunk {
  name: string;
  entry: Array<string>;
  parent: ?Chunk;
  filesState: Map<string, File>;
  filesLocked: Set<string>;

  constructor(name: string, entry: Array<string>, parent: ?Chunk = null) {
    this.name = name
    this.entry = entry
    this.parent = parent
    this.filesState = new Map()
    this.filesLocked = new Set()
  }
  lock(filePath: string): void {
    this.filesLocked.add(filePath)
  }
  unlock(filePath: string): void {
    this.filesLocked.delete(filePath)
  }
  isLocked(filePath: string): boolean {
    return this.filesLocked.has(filePath)
  }
  setFile(filePath: string, file: File): void {
    this.filesState.set(filePath, file)
  }
  getFile(filePath: string): File {
    const file = this.filesState.get(filePath)
    invariant(file, `${filePath} not found in files`)
    return file
  }
  deleteFile(filePath: string): void {
    this.filesState.delete(filePath)
  }
}
