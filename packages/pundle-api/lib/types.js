// @flow

export type ErrorType = 'CONFIG'
export type ErrorCode = 'FILE_NOT_FOUND' | 'CONFIG_NOT_FOUND' | 'INVALID_CONFIG'

export type ComponentType = 'issue-reporter'
export type ComponentCallback<T1, T2> = (context: $FlowFixMe, job: $FlowFixMe, ...T1) => Promise<T2> | T2
export type Component<T1: ComponentType, T2> = {|
  name: string,
  version: string,
  priority: number,
  type: T1,
  callback: T2,

  // automatically added
  apiVersion: number,
|}

export type ComponentIssueReporterCallback = ComponentCallback<[any], void>
export type ComponentIssueReporter = Component<'issue-reporter', ComponentIssueReporterCallback>
