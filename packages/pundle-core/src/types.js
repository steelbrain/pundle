// @flow

import type { File, Job } from 'pundle-api'
import type Compilation from './compilation'

export type WatcherAdapter = 'chokidar'
export type WatcherConfig = {
  adapter?: WatcherAdapter,
  tick?: (compilation: Compilation, oldFile: ?File, newFile: File) => Promise<void> | void,
  ready?: (compilation: Compilation, job: Job) => Promise<void> | void,
  compiled?: (compilation: Compilation, job: Job) => Promise<void> | void,
}

export type WatcherOutput = {
  dispose(): void,
}
