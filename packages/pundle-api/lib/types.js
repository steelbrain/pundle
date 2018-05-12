// @flow

export type ErrorType = 'CONFIG' | 'DAEMON'
export type ErrorCode = 'FILE_NOT_FOUND' | 'CONFIG_NOT_FOUND' | 'INVALID_CONFIG' | 'WORKER_CRASHED'

export type Loc = {
  line: number,
  col: number,
}
export type Chunk = {
  id: string,
  format: string,
  label: ?string,
  entry: ?string,
  imports: Array<string>,
}
export type ImportResolved = {
  format: string,
  filePath: string,
}
export type ImportRequest = {
  request: string,
  requestRoot: string,
  ignoredResolvers: Array<string>,
}

export type ComponentType = 'issue-reporter' | 'file-resolver' | 'file-loader' | 'file-transformer'
export type Component<T1: ComponentType, T2> = {|
  name: string,
  version: string,
  priority: number,
  type: T1,
  callback: T2,

  // automatically added
  apiVersion: number,
|}

export type ComponentIssueReporterCallback = (issue: any) => void | Promise<void>
export type ComponentIssueReporter = Component<'issue-reporter', ComponentIssueReporterCallback>

export type ComponentFileResolverRequest = {|
  request: string,
  requestRoot: string,
  format: ?string,
  resolved: ?string,
  resolvedRoot: ?string,
|}
export type ComponentFileResolverResult = {|
  request: string,
  requestRoot: string,
  format: string,
  resolved: string,
  resolvedRoot: ?string,
|}
export type ComponentFileResolverCallback = (
  request: ComponentFileResolverRequest,
) => Promise<?ComponentFileResolverResult> | ?ComponentFileResolverResult
export type ComponentFileResolver = Component<'file-resolver', ComponentFileResolverCallback>

export type ComponentFileLoaderRequest = {|
  format: string,
  contents: Buffer,
  filePath: string,
|}

export type ComponentFileLoaderResult = {|
  contents: Buffer | string,
  isBuffer: boolean,
  sourceMap: ?Object,
|}

export type ComponentFileLoaderCallback = (
  request: ComponentFileLoaderRequest,
) => Promise<?ComponentFileLoaderResult> | ?ComponentFileLoaderResult
export type ComponentFileLoader = Component<'file-loader', ComponentFileLoaderCallback>

export type ComponentFileTransformerRequest = {|
  filePath: string,
  format: string,
  contents: Buffer | string,
  isBuffer: boolean,
  sourceMap: ?Object,
|}
// TODO: Maybe transform original error to have a loc?
export type ComponentFileTransformerContext = {|
  resolve(request: string, loc: ?Loc): Promise<ImportResolved>,
  addImport(fileImport: ImportResolved): void,
  addChunk(chunk: $FlowFixMe): void,
|}
export type ComponentFileTransformerResult = {|
  contents: Buffer | string,
  isBuffer: boolean,
  sourceMap: ?Object,
|}
export type ComponentFileTransformerCallback = (
  request: ComponentFileTransformerRequest,
  context: ComponentFileTransformerContext,
) => Promise<?ComponentFileTransformerResult> | ?ComponentFileTransformerResult
export type ComponentFileTransformer = Component<'file-transformer', ComponentFileTransformerCallback>
