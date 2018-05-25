// @flow

import type Job from './job'

type GetFileNamePayload = { id: string, entry: ?string, format: string }

export type ErrorType = 'CONFIG' | 'DAEMON'
export type ErrorCode = 'FILE_NOT_FOUND' | 'CONFIG_NOT_FOUND' | 'INVALID_CONFIG' | 'WORKER_CRASHED'

export type Loc = {
  line: number,
  col: number,
}
export type ImportResolved = {
  format: string,
  filePath: string,
}
export type ImportRequest = {
  request: string,
  requestFile: ?string,
  ignoredResolvers: Array<string>,
}
export type Chunk = {
  id: string,
  format: string,
  label: ?string,
  entry: ?string,
  imports: Array<ImportResolved>,
}

export type WorkerProcessResult = {
  id: string,
  filePath: string,
  format: string,
  contents: Buffer | string,
  sourceMap: ?Object,
  imports: Array<ImportResolved>,
  chunks: Array<Chunk>,
}

export type ComponentType = 'issue-reporter' | 'file-resolver' | 'file-transformer' | 'job-transformer' | 'chunk-generator'
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
  requestFile: ?string,
  format: ?string,
  resolved: ?string,
  resolvedRoot: ?string,
|}
export type ComponentFileResolverResult = {|
  request: string,
  requestFile: ?string,
  format: string,
  resolved: string,
  resolvedRoot: ?string,
|}
export type ComponentFileResolverCallback = (
  request: ComponentFileResolverRequest,
  context: { rootDirectory: string },
) => Promise<?ComponentFileResolverResult> | ?ComponentFileResolverResult
export type ComponentFileResolver = Component<'file-resolver', ComponentFileResolverCallback>

export type ComponentFileTransformerRequest = {|
  filePath: string,
  format: string,
  contents: Buffer | string,
  sourceMap: ?Object,
|}
// TODO: Maybe transform original error to have a loc?
export type ComponentFileTransformerContext = {|
  resolve(request: string, loc: ?Loc): Promise<ImportResolved>,
  addImport(fileImport: ImportResolved): void,
  addChunk(chunk: Chunk): void,
  getFileName(payload: GetFileNamePayload): string | false,
|}
export type ComponentFileTransformerResult = {|
  contents: Buffer | string,
  sourceMap: ?Object,
|}
export type ComponentFileTransformerCallback = (
  request: ComponentFileTransformerRequest,
  context: ComponentFileTransformerContext,
) => Promise<?ComponentFileTransformerResult> | ?ComponentFileTransformerResult
export type ComponentFileTransformer = Component<'file-transformer', ComponentFileTransformerCallback>

export type ComponentJobTransformerCallback = (job: Job) => Promise<?Job> | ?Job
export type ComponentJobTransformer = Component<'job-transformer', ComponentJobTransformerCallback>

export type ComponentChunkGeneratorResult = Array<{
  format: string,
  contents: string | Buffer,
}>
export type ComponentChunkGeneratorCallback = (
  chunk: Chunk,
  job: Job,
  {
    getFileName: (payload: GetFileNamePayload) => string | false,
  },
) => Promise<?ComponentChunkGeneratorResult> | ?ComponentChunkGeneratorResult
export type ComponentChunkGenerator = Component<'chunk-generator', ComponentChunkGeneratorCallback>
