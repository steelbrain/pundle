// @flow

export type ComponentRules = {
  include?: string | Array<string>,
  exclude?: string | Array<string>,
  extensions?: string | Array<string>,
}

export type HookName =
  | 'resolve'
  | 'report'
  | 'language-parse'
  | 'language-plugin'
  | 'language-generate'

export type Component = {
  name: string,
  version: string,
  hookName: HookName,
  callback: Function,
  defaultOptions: Object,

  // Automatically added
  apiVersion: number,
}
export type ComponentOptionsEntry = {
  options: Object,
  component: Component,
}

export type BaseConfig = {
  entry: Array<string>,
  target: 'browser',
  rootDirectory: string,
}
export type ResolvePayload = {
  request: string,
  requestRoot: string,
  resolved: ?string,
  resolvedRoot: ?string,
  ignoredResolvers: Array<string>,
}

export type Chunk = {
  entry: string,
  files: Array<string>,
  // ^ RESOLVED file paths to include in the main output bundle
}
export type Import = string

export type File = {
  filePath: string,
  lastModified: number,

  sourceContents: string,
  generatedMap: ?Object,
  generatedContents: string,

  parsed: ?Object,
  imports: Array<Import>,
  chunks: Array<Chunk>,
}
