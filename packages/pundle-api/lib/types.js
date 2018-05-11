// @flow

export type ErrorType = 'CONFIG' | 'DAEMON'
export type ErrorCode = 'FILE_NOT_FOUND' | 'CONFIG_NOT_FOUND' | 'INVALID_CONFIG' | 'WORKER_CRASHED'

export type ComponentType = 'issue-reporter' | 'file-resolver'
export type ComponentCallback<T1, T2> = (...T1) => Promise<?T2> | ?T2
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

export type ComponentFileResolverCallback = ComponentCallback<
  [
    {|
      request: string,
      requestRoot: string,
      format?: string,
      resolved: ?string,
      resolvedRoot: ?string,
    |},
  ],
  {|
    request: string,
    requestRoot: string,
    format: string,
    resolved: string,
    resolvedRoot: ?string,
  |},
>
export type ComponentFileResolver = Component<'file-resolver', ComponentFileResolverCallback>
