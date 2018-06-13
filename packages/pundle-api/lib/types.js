// @flow

import type Job from './job'
import type Context from './context'

export type ErrorType = 'CONFIG' | 'DAEMON' | 'WORK'
export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'CONFIG_NOT_FOUND'
  | 'INVALID_CONFIG'
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
  root: boolean,
  format: string,
  label: ?string,
  entry: ?string,
  imports: Array<ImportResolved>,
}

export type ImportTransformed = {
  format: string,
  filePath: string,
  contents: Buffer | string,
  sourceMap: ?Object | false,
  chunks: Array<Chunk>,
  imports: Array<ImportResolved>,
}

export type TransformRequest = {
  format: string,
  filePath: string,
  contents: Buffer | string,
}
export type TransformResult = {|
  contents: Buffer | string,
  sourceMap: ?Object | false,
  chunks: Array<Chunk>,
  imports: Array<ImportResolved>,
|}
export type ChunkGenerated = {|
  chunk: Chunk,
  format: string,
  contents: string | Buffer,
  filePath: string | false,
  sourceMap?: {
    filePath: string | false,
    contents: string,
  },
|}
export type ChunksGenerated = {
  directory: string,
  outputs: Array<ChunkGenerated>,
}

export interface PundleWorker {
  resolve(payload: ImportRequest): Promise<ImportResolved>;
  transformFile(payload: ImportResolved): Promise<ImportTransformed>;
  report(issue: any): Promise<void>;
}

export type ComponentType =
  | 'issue-reporter'
  | 'file-resolver'
  | 'file-transformer'
  | 'job-transformer'
  | 'chunk-generator'
  | 'chunk-transformer'
export type Component<T1: ComponentType, T2> = {|
  name: string,
  version: string,
  priority: number,
  type: T1,
  callback: T2,

  // automatically added
  apiVersion: number,
|}

export type ComponentIssueReporterCallback = (params: {
  context: Context,
  issue: any,
}) => void | Promise<void>
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
  worker: PundleWorker,
}) => Promise<?ComponentFileResolverResult> | ?ComponentFileResolverResult
export type ComponentFileResolver = Component<'file-resolver', ComponentFileResolverCallback>

// TODO: Maybe transform original error to have a loc?
export type ComponentFileTransformerResult = {|
  contents: Buffer | string,
  sourceMap: ?Object | false,
|}
export type ComponentFileTransformerCallback = (params: {
  file: {
    filePath: string,
    format: string,
    contents: Buffer | string,
    sourceMap: ?Object | false,
  },
  context: Context,
  worker: PundleWorker,
  resolve(request: string, loc: ?Loc): Promise<ImportResolved>,
  addImport(fileImport: ImportResolved): Promise<void>,
  addChunk(chunk: Chunk): Promise<void>,
}) => Promise<?ComponentFileTransformerResult> | ?ComponentFileTransformerResult
export type ComponentFileTransformer = Component<'file-transformer', ComponentFileTransformerCallback>

export type ComponentJobTransformerResult = { job: Job }
export type ComponentJobTransformerCallback = (params: { context: Context, worker: PundleWorker, job: Job }) =>
  | Promise<?ComponentJobTransformerResult>
  | ?ComponentJobTransformerResult
export type ComponentJobTransformer = Component<'job-transformer', ComponentJobTransformerCallback>

export type ComponentChunkGeneratorResult = {
  format: string,
  contents: string | Buffer,
  sourceMap?: {
    filePath: string | false,
    contents: string,
  },
}
export type ComponentChunkGeneratorCallback = (params: {
  job: Job,
  chunk: Chunk,
  context: Context,
  worker: PundleWorker,
}) => Promise<?ComponentChunkGeneratorResult> | ?ComponentChunkGeneratorResult
export type ComponentChunkGenerator = Component<'chunk-generator', ComponentChunkGeneratorCallback>

export type ComponentChunkTransformerResult = {
  contents: string | Buffer,
  sourceMap: ?{
    contents: string,
  },
}
export type ComponentChunkTransformerCallback = (
  params: ChunkGenerated & {
    context: Context,
    worker: PundleWorker,
  },
) => Promise<?ComponentChunkTransformerResult> | ?ComponentChunkTransformerResult
export type ComponentChunkTransformer = Component<'chunk-transformer', ComponentChunkTransformerCallback>
