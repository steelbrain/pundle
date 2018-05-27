// @flow

// Tasks assigned to the worker
export type WorkerJobType = 'resolve' | 'process'

// Tasks worker can request from master
export type WorkerRequestType = 'resolve'
