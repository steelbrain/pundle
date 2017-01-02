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

export type Import = {
  id: number,
  from: string,
  request: string,
  resolved: ?string,
}

export type File = {
  source: string,
  imports: Set<Import>,
  filePath: string,
  // ^ The absolute path on file system
  contents: string,
  sourceMap: ?Object,
}

export type LoaderCallback = ((config: Object, file: File) => Promise<?{ imports: Set<Import>, contents: string, sourceMap: ?Object }>)
export type Loader = Component<'loader', LoaderCallback>

export type PluginCallback = ((config: Object, file: File) => Promise<void>)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverCallback = ((config: Object, request: string, fromFile: ?string, cached: boolean) => Promise<?string>)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterCallback = ((config: Object, error: Error | FileIssue | MessageIssue) => Promise<void>)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorCallback = ((config: Object, files: Array<File>, runtimeConfig: Object) => Promise<?Object>)
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerCallback = ((config: Object, file: File) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerCallback = ((config: Object, contents: string) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type WatcherCallbacks = {
  tick?: ((filePath: string, error: ?Error) => Promise<void> | void),
  update?: ((filePath: string, newImports: Array<string>, oldImports: Array<string>) => Promise<void> | void),
  ready?: ((initialCompileStatus: boolean, totalFiles: Array<File>) => Promise<void> | void),
  compile?: ((totalFiles: Array<File>) => Promise<void> | void),
}
export type Watcher = {
  $type: 'watcher',
  $apiVersion: number,
  activate(config: Object): void,
  tick(filePath: string, error: ?Error): Promise<void> | void,
  update(filePath: string, newImports: Array<string>, oldImports: Array<string>): Promise<void> | void,
  ready(initialCompileStatus: boolean, totalFiles: Array<File>): Promise<void> | void,
  compile(totalFiles: Array<File>): Promise<void> | void,
  dispose(config: Object): void,
  defaultConfig: Object,
}

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer | Watcher
