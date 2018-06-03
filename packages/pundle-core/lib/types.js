// @flow

import type { Job, Context, ImportTransformed } from 'pundle-api'

// Tasks assigned to the worker
export type WorkerJobType = 'resolve' | 'transform'

// Tasks worker can request from master
export type WorkerRequestType = 'resolve'

export type WatchAdapter = 'chokidar'
export type WatchOptions = {
  adapter: WatchAdapter,
  tick(params: { job: Job, context: Context, oldFile: ?ImportTransformed, newFile: ImportTransformed }): Promise<
    void,
  > | void,
  ready(params: { job: Job, context: Context }): Promise<void> | void,
  compiled(params: { job: Job, context: Context }): Promise<void> | void,
}
