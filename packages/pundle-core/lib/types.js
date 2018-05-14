// @flow

export type RunOptions = {|
  config: $FlowFixMe,
  directory: string,
  configFileName: string,
  loadConfigFile: boolean,
|}

export type WorkerType = 'resolver' | 'processor'

// Tasks assigned to the worker
export type WorkerJobType = 'resolve' | 'process'

// Tasks worker can request from master
export type WorkerRequestType = 'resolve'
