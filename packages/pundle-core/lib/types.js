// @flow

export type RunOptions = {|
  config: $FlowFixMe,
  directory: string,
  configFileName: string,
  loadConfigFile: boolean,
|}

export type WorkerType = 'resolver' | 'processor'
