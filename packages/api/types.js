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

export type LoaderCallback = ((file: File, config: Object, pundle: Object) => ?{ imports: Set<string>, contents: string, sourceMap: ?Object })
export type Loader = Component<'loader', LoaderCallback>

export type PluginCallback = ((file: File, config: Object, pundle: Object) => void)
export type Plugin = Component<'plugin', PluginCallback>

export type ResolverCallback = ((request: string, fromFile: ?string, cached: boolean, config: Object, pundle: Object) => ?string)
export type Resolver = Component<'resolver', ResolverCallback>

export type ReporterCallback = ((error: Error | Array<Error>, config: Object, pundle: Object) => void)
export type Reporter = Component<'reporter', ReporterCallback>

export type GeneratorCallback = ((generated: Array<File>, config: Object, pundle: Object) => ?{ contents: string, sourceMap: string })
export type Generator = Component<'generator', GeneratorCallback>

export type TransformerCallback = ((file: File, config: Object, pundle: Object) => ?{ contents: string, sourceMap: ?Object })
export type Transformer = Component<'transformer', TransformerCallback>

export type PostTransformerCallback = ((file: File, config: Object, pundle: Object) => ?{ contents: string, sourceMap: ?Object })
export type PostTransformer = Component<'post-transformer', PostTransformerCallback>

export type ComponentAny = Loader | Plugin | Resolver | Reporter | Generator | Transformer | PostTransformer
