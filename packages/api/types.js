/* @flow */

// TODO: Store loc in import requests so we can show that in not found errors

import type { FileIssue, MessageIssue } from './src/issues'
export type { FileIssue, MessageIssue } from './src/issues'

export type ComponentRule = string | RegExp
export type ComponentRules = {
  include?: ComponentRule | Array<ComponentRule>,
  exclude?: ComponentRule | Array<ComponentRule>,
  extensions?: Array<string>,
}

export type Component<T1, T2> = {
  $type: T1,
  $apiVersion: number,
  activate(config: Object): void,
  callback: T2,
  dispose(config: Object): void,
  defaultConfig: Object,
}

export type CallbackOrConfig<T> = T | {
  activate?: ((config: Object) => void),
  callback: T,
  dispose?: ((config: Object) => void),
}

export type FileImport = {
  id: number,
  from: ?string,
  request: string,
  resolved: ?string,
}
export type FileChunk = {
  entry: Array<FileImport>,
  imports: Array<FileImport>,
}

export type File = {
  source: string,
  chunks: Array<FileChunk>,
  imports: Array<FileImport>,
  filePath: string,
  // ^ The absolute path on file system
  contents: string,
  sourceMap: ?Object,
  lastModified: number,
  // ^ in seconds not miliseconds aka Date.now()/1000
}

export type Chunk = {
  files: Map<string, File>;
  entry: Array<FileImport>;
  imports: Set<FileImport>;
  getEntry(): Array<FileImport>;
  getFiles(): Array<File>;
  hasFile(filePath: string): boolean;
  addFile(filePath: string, file: File): void;
  deleteFile(filePath: string): void;
}

export type LoaderResult = {
  chunks: Array<FileChunk>,
  imports: Array<FileImport>,
  contents: string,
  sourceMap: ?Object,
}
export type LoaderCallback = ((config: Object, file: File) => Promise<?LoaderResult>)
export type Loader = Component<'loader', LoaderCallback>

export type PluginResult = void
export type PluginCallback = ((config: Object, file: File) => Promise<?PluginResult>)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverResult = {
  filePath: string,
  sourceManifest: Object,
  targetManifest: Object,
}
export type ResolverCallback = ((config: Object, request: string, fromFile: ?string, cached: boolean) => Promise<?ResolverResult>)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterResult = void
export type ReporterCallback = ((config: Object, error: Error | FileIssue | MessageIssue) => Promise<ReporterResult>)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorResult = { contents: string, sourceMap: Object, filePaths: Array<string> }
export type GeneratorCallback = ((config: Object, files: Chunk, runtimeConfig: Object) => Promise<?GeneratorResult>)
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerResult = {
  contents: string,
  sourceMap: ?Object,
}
export type TransformerCallback = ((config: Object, file: File) => Promise<?TransformerResult>)
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerResult = {
  contents: string,
  sourceMap: ?Object,
}
export type PostTransformerCallback = ((config: Object, contents: string) => Promise<?PostTransformerResult>)
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type ChunkTransformerResult = void
export type ChunkTransformerCallback = ((config: Object, chunks: Array<Chunk>) => Promise<?ChunkTransformerResult>)
export type ChunkTransformer = Component<'chunk-transformer', ChunkTransformerCallback>

export type WatcherCallbacks = {
  tick?: ((filePath: string, error: ?Error) => Promise<void> | void),
  ready?: ((initialCompileStatus: boolean, totalFiles: Array<File>) => Promise<void> | void),
  compile?: ((totalFiles: Array<File>) => Promise<void> | void),
}
export type Watcher = {
  $type: 'watcher',
  $apiVersion: number,
  activate(config: Object): void,
  tick(filePath: string, error: ?Error, file: ?File): Promise<void> | void,
  ready(initialCompileStatus: boolean, totalFiles: Array<File>): Promise<void> | void,
  compile(totalFiles: Array<File>): Promise<void> | void,
  dispose(config: Object): void,
  defaultConfig: Object,
}

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer | Watcher | ChunkTransformer
