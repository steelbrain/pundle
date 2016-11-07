/* @flow */

import type { FileError, MessageError } from './src/errors'
export type { FileError, MessageError } from './src/errors'

export type ComponentRule = string | RegExp
export type ComponentConfig = {
  include?: ComponentRule | Array<ComponentRule>,
  exclude?: ComponentRule | Array<ComponentRule>,
}

export type Component<T1, T2> = {
  $type: T1,
  $apiVersion: number,
  activate(): void,
  callback: T2,
  dispose(): void,
  defaultConfig: Object,
}

export type CallbackOrConfig<T> = T | {
  activate?: (() => void),
  callback: T,
  dispose?: (() => void),
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
  // ^ The abs path on file system
  contents: string,
  sourceMap: ?Object,
}

export type LoaderCallback = ((config: Object, file: File) => Promise<?{ imports: Set<Import>, contents: string, sourceMap: ?Object }>)
export type Loader = Component<'loader', LoaderCallback>

export type PluginCallback = ((config: Object, file: File) => Promise<void>)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverCallback = ((config: Object, request: string, fromFile: ?string, cached: boolean) => Promise<?string>)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterCallback = ((config: Object, error: Error | FileError | MessageError) => Promise<void>)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorCallback = ((config: Object, files: Array<File>, runtimeConfig: Object) => Promise<?Object>)
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerCallback = ((config: Object, file: File) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerCallback = ((config: Object, contents: string) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer
