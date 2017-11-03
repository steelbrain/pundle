// @flow

import type Context from './Context'

export type ComponentRules = {
  include?: string | Array<string>,
  exclude?: string | Array<string>,
  extensions?: string | Array<string>,
}

export type BaseConfig = {
  entry: Array<string>,
  target: 'browser',
  rootDirectory: string,
}
export type ResolvePayload = {|
  request: string,
  requestRoot: string,
  ignoredResolvers: Array<string>,

  resolved: ?string,
  resolvedRoot: ?string,
|}

export type Import = string
export type Chunk = {|
  entry: string,
  imports: Array<Import>,
  // ^ RESOLVED file paths to include in the main output bundle
|}

export type File = {|
  fileName: string,
  filePath: string,
  lastModified: number,

  contents: string,
  sourceContents: string,
  sourceMap: ?Object,

  imports: Array<Import>,
  chunks: Array<Chunk>,
|}

export type Severity = 'info' | 'warning' | 'error'
export type ComponentType = 'resolver' | 'reporter' | 'loader' | 'transformer'
export type ComponentCallback<TARGUMENTS, TRETURNVALUE> = (
  context: Context,
  options: Object,
  ...TARGUMENTS
) => Promise<?TRETURNVALUE> | ?TRETURNVALUE
export type Component<TTYPE: ComponentType, TCALLBACK> = {|
  name: string,
  version: string,
  type: TTYPE,
  callback: TCALLBACK,
  defaultOptions: Object,

  // Automatically added
  apiVersion: number,
|}

export type ComponentResolverCallback = ComponentCallback<[ResolvePayload], void>
export type ComponentResolver = Component<'resolver', ComponentResolverCallback>

export type ComponentReporterCallback = ComponentCallback<[any], void>
export type ComponentReporter = Component<'reporter', ComponentReporterCallback>

export type ComponentLoaderCallback = ComponentCallback<
  [File],
  {|
    chunks: Array<Chunk>,
    imports: Array<Import>,
    contents: string,
    sourceMap: ?Object,
  |},
>
export type ComponentLoader = Component<'loader', ComponentLoaderCallback>

export type ComponentTransformerCallback = ComponentCallback<
  [File],
  {|
    contents: string,
    sourceMap: ?Object,
  |},
>
export type ComponentTransformer = Component<'transformer', ComponentTransformerCallback>

export type ComponentAny = ComponentResolver | ComponentReporter | ComponentLoader | ComponentTransformer

export type ComponentOptionsEntry = {|
  options: Object,
  component: ComponentAny,
|}
