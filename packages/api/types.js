/* @flow */

import type { File, FileChunk, FileIssue, MessageIssue, Context } from './lib'

export type { FileIssue, MessageIssue } from './lib/issues'

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
  request: string,
  resolved: ?string,
  from: ?string,
  type: 'es' | 'cjs',
  namespaces: Array<string>,
}

export type LoaderResult = {
  chunks: Array<FileChunk>,
  imports: Array<FileImport>,
  contents: string,
  sourceMap: ?Object,
}
export type LoaderCallback = ((context: Context, config: Object, file: File) => Promise<?LoaderResult>)
export type Loader = Component<'loader', LoaderCallback>

export type PluginResult = void
export type PluginCallback = ((context: Context, config: Object, file: File) => Promise<?PluginResult>)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverResult = {
  filePath: string,
  sourceManifest: Object,
  targetManifest: ?Object,
}
export type ResolverCallback = ((context: Context, config: Object, request: string, fromFile: ?string, cached: boolean) => Promise<?ResolverResult>)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterResult = void
export type ReporterCallback = ((context: Context, config: Object, error: Error | FileIssue | MessageIssue) => Promise<ReporterResult>)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorResult = {
  chunk: FileChunk,
  contents: string,
  sourceMap: Object,
  filesGenerated: Array<string>,
}
export type GeneratorCallback = ((context: Context, config: Object, chunk: FileChunk, runtimeConfig: Object) => Promise<?GeneratorResult>)
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerResult = {
  contents: string,
  sourceMap: ?Object,
}
export type TransformerCallback = ((context: Context, config: Object, file: File) => Promise<?TransformerResult>)
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerResult = {
  contents: string,
  sourceMap: ?Object,
}
export type PostTransformerCallback = ((context: Context, config: Object, contents: string) => Promise<?PostTransformerResult>)
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type ChunkTransformerResult = void
export type ChunkTransformerCallback = ((context: Context, config: Object, chunks: Array<FileChunk>) => Promise<?ChunkTransformerResult>)
export type ChunkTransformer = Component<'chunk-transformer', ChunkTransformerCallback>

export type WatcherCallbacks = {
  tick?: ((context: Context, config: Object, file: File) => Promise<void> | void),
  ready?: ((context: Context, config: Object, chunks: Array<FileChunk>, files: Map<string, File>) => Promise<void> | void),
  compile?: ((context: Context, config: Object, chunks: Array<FileChunk>, files: Map<string, File>) => Promise<void> | void),
}
export type Watcher = {
  $type: 'watcher',
  $apiVersion: number,
  activate(config: Object): void,
  tick(context: Context, config: Object, file: File): Promise<void> | void,
  ready(context: Context, config: Object, chunks: Array<FileChunk>, files: Map<string, File>): Promise<void> | void,
  compile(context: Context, config: Object, chunks: Array<FileChunk>, files: Map<string, File>): Promise<void> | void,
  dispose(config: Object): void,
  defaultConfig: Object,
}

export type Preset = Array<{ component: string | Object, config: Object, name: string }>
export type Loaded = [Object, Object]
export type Loadable = string | Object | [string, Object] | [Object, Object]
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

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer | Watcher | ChunkTransformer
export type ComponentConfigured = {
  config: Object,
  component: ComponentAny,
}

export type {
  File,
  FileChunk,
  Context,
}
