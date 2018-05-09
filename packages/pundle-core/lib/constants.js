// @flow

import type { WorkerJobType, WorkerRequestType } from './types'

export const CONFIG_FILE_NAME = 'pundle.config.js'
export const WORKER_JOB_TYPE: Array<WorkerJobType> = ['resolve', 'process']
export const WORKER_REQUEST_TYPE: Array<WorkerRequestType> = ['resolve']
