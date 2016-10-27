/* @flow */

export type ComponentRule = string | RegExp
export type ComponentConfig = {
  include?: ComponentRule | Array<ComponentRule>,
  exclude?: ComponentRule | Array<ComponentRule>,
}

export type Component<T1, T2> = {
  $type: T1,
  $apiVersion: number,
  callback: T2,
  defaultConfig: Object,
}

export type File = {
  source: string,
  imports: Set<string>,
  filePath: string,
  // ^ The abs path on file system
  contents: string,
  sourceMap: ?Object,
  publicPath: string,
  // ^ Not the path on file system, but the path to show in frontend, like $root/some.js
}

export type LoaderCallback = ((config: Object, file: File) => Promise<?{ imports: Set<string>, contents: string, sourceMap: ?Object }>)
export type Loader = Component<'loader', LoaderCallback>

export type PluginCallback = ((config: Object, file: File) => void)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverCallback = ((config: Object, request: string, fromFile: ?string, cached: boolean) => Promise<?string>)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterCallback = ((config: Object, error: Error | Array<Error>) => void)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorCallback = ((config: Object, generated: Array<File>) => Promise<?{ contents: string, sourceMap: string }>)
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerCallback = ((config: Object, file: File) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerCallback = ((config: Object, file: File) => Promise<?{ contents: string, sourceMap: ?Object }>)
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer
