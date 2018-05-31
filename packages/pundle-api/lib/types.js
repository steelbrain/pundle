// @flow

import type Job from './job'
import type Context from './context'

export type ErrorType = 'CONFIG' | 'DAEMON' | 'WORK'
export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'CONFIG_NOT_FOUND'
  | 'INVALID_CONFIG'
  | 'WORKER_CRASHED'
  | 'RESOLVE_FAILED'
  | 'TRANSFORM_FAILED'
  | 'GENERATE_FAILED'

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
  format: string,
  label: ?string,
  entry: ?string,
  imports: Array<ImportResolved>,
}

export type ImportTransformed = {
  format: string,
  filePath: string,
  contents: Buffer | string,
  sourceMap: ?Object,
  chunks: Array<Chunk>,
  imports: Array<ImportResolved>,
}

export type TransformRequest = {
  filePath: string,
  format: string,
  contents: Buffer | string,
  resolve: (request: string) => Promise<ImportResolved>,
}
export type TransformResult = {|
  contents: Buffer | string,
  sourceMap: ?Object,
  chunks: Array<Chunk>,
  imports: Array<ImportResolved>,
|}
export type ChunksGenerated = {
  directory: string,
  outputs: Array<{
    chunk: Chunk,
    format: string,
    contents: string | Buffer,
    fileName: string | false,
  }>,
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

export type ComponentFileResolverResult = {|
  format: string,
  filePath: string,
  packageRoot: ?string,
|}
export type ComponentFileResolverCallback = (params: {
  context: Context,
  request: string,
  requestFile: ?string,
  ignoredResolvers: Array<string>,
  resolve(request: ImportRequest): Promise<ImportResolved>,
}) => Promise<?ComponentFileResolverResult> | ?ComponentFileResolverResult
export type ComponentFileResolver = Component<'file-resolver', ComponentFileResolverCallback>

// TODO: Maybe transform original error to have a loc?
export type ComponentFileTransformerResult = {|
  contents: Buffer | string,
  sourceMap: ?Object,
|}
export type ComponentFileTransformerCallback = (params: {
  file: {
    filePath: string,
    format: string,
    contents: Buffer | string,
    sourceMap: ?Object,
  },
  context: Context,
  resolve(request: string, loc: ?Loc): Promise<ImportResolved>,
  addImport(fileImport: ImportResolved): Promise<void>,
  addChunk(chunk: Chunk): Promise<void>,
}) => Promise<?ComponentFileTransformerResult> | ?ComponentFileTransformerResult
export type ComponentFileTransformer = Component<'file-transformer', ComponentFileTransformerCallback>

export type ComponentJobTransformerResult = { job: Job }
export type ComponentJobTransformerCallback = (params: { context: Context, job: Job }) =>
  | Promise<?ComponentJobTransformerResult>
  | ?ComponentJobTransformerResult
export type ComponentJobTransformer = Component<'job-transformer', ComponentJobTransformerCallback>

export type ComponentChunkGeneratorResult = Array<{
  format: string,
  contents: string | Buffer,
}>
export type ComponentChunkGeneratorCallback = (params: {
  job: Job,
  chunk: Chunk,
  context: Context,
}) => Promise<?ComponentChunkGeneratorResult> | ?ComponentChunkGeneratorResult
export type ComponentChunkGenerator = Component<'chunk-generator', ComponentChunkGeneratorCallback>
