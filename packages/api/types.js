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
  id: number,
  label: string,
  // eslint-disable-next-line no-use-before-define
  files: Map<string, File>,
  entries: Array<FileImport>,
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

export type GeneratorResult = {
  chunk: FileChunk,
  contents: string,
  sourceMap: Object,
  filesGenerated: Array<string>,
}
export type GeneratorCallback = ((config: Object, chunk: FileChunk, runtimeConfig: Object) => Promise<?GeneratorResult>)
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
export type ChunkTransformerCallback = ((config: Object, chunks: Array<FileChunk>) => Promise<?ChunkTransformerResult>)
export type ChunkTransformer = Component<'chunk-transformer', ChunkTransformerCallback>

export type WatcherCallbacks = {
  tick?: ((file: File) => Promise<void> | void),
  ready?: ((chunks: Array<FileChunk>, files: Map<string, File>) => Promise<void> | void),
  compile?: ((chunks: Array<FileChunk>, files: Map<string, File>) => Promise<void> | void),
}
export type Watcher = {
  $type: 'watcher',
  $apiVersion: number,
  activate(config: Object): void,
  tick(file: File): Promise<void> | void,
  ready(chunks: Array<FileChunk>, files: Map<string, File>): Promise<void> | void,
  compile(chunks: Array<FileChunk>, files: Map<string, File>): Promise<void> | void,
  dispose(config: Object): void,
  defaultConfig: Object,
}

export type Preset = Array<{ component: string | Object, config: Object, name: string }>
export type Loaded = [Object, Object]
export type Loadable = string | [string, Object] | [Object, Object]
// NOTE: This is the config is after transformation, not what Pundle accepts
export type PundleConfig = {
  debug: boolean,
  entry: Array<string>,
  output: {
    sourceMap?: boolean,
    publicRoot?: string,
    bundlePath?: string,
    sourceMapPath?: string,
    rootDirectory?: string,
  },
  server: {
    port?: number,
    hmrHost?: string,
    hmrPath?: string,
    bundlePath?: string,
    sourceMapPath?: string,
    rootDirectory: string,
    redirectNotFoundToIndex?: boolean,
  },
  presets: Array<Loadable>,
  watcher: {
    usePolling: boolean,
  },
  components: Array<Loadable>,
  rootDirectory: string,
  replaceVariables: Object, // <string, Object>
}

export type Context = {
  config: PundleConfig,
  report(content: Error | FileIssue | MessageIssue): Promise<void>,
  resolveAdvanced(request: string, from: ?string, cached: boolean): Promise<ResolverResult>,
  resolve(request: string, from: ?string, cached: boolean): Promise<string>,
  generate(chunks: Array<FileChunk>, generateConfig: Object): Promise<Array<GeneratorResult>>,
  serialize(): string,
  unserialize(contents: string, force: boolean): void,
  getChunk(entries: ?Array<FileImport>, label: ?string, imports: ?Array<FileImport>, files: ?Map<string, File>): FileChunk,
  getImportRequest(request: string, from: ?string): FileImport,
}

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer | Watcher | ChunkTransformer
