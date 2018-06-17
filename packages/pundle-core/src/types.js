// @flow

import type { Job, Context, ImportResolved, ImportTransformed } from 'pundle-api'

export type WatchAdapter = 'chokidar' | 'nsfw'
export type WatchOptions = {
  adapter?: WatchAdapter,
  tick?: (params: { job: Job, context: Context, oldFile: ?ImportTransformed, newFile: ImportTransformed }) => Promise<
    void,
  > | void,
  generate?: (params: {
    job: Job,
    context: Context,
    changed: Array<ImportResolved>,
  }) => Promise<void> | void,
}

export type InternalChangedFiles = Map<string, ImportResolved>
