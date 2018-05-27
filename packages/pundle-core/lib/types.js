// @flow

import type { Config } from 'pundle-core-load-config'

export type RunOptions = {|
  config: Config,
  directory: string,
  configFileName: string,
  loadConfigFile: boolean,
|}

// Tasks assigned to the worker
export type WorkerJobType = 'resolve' | 'process'

// Tasks worker can request from master
export type WorkerRequestType = 'resolve'
