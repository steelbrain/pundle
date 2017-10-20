// @flow

import type Context from './context'

export type ComponentRules = {
  include?: string | Array<string>,
  exclude?: string | Array<string>,
  extensions?: string | Array<string>,
}

export type HookName = 'resolve' | 'report' | 'language-parse' | 'language-process' | 'language-generate'

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
  fileName: string,
  filePath: string,
  lastModified: number,
  contents: string,

  parsed: ?Object,
  imports: Array<Import>,
  chunks: Array<Chunk>,
}

export type FileGenerated = {
  filePath: string,
  lastModified: number,
  sourceContents: string,
  sourceContents: string,
  generatedMap: ?Object,
  generatedContents: string,
}

export type ComponentResolver = (context: Context, options: Object, payload: ResolvePayload) => Promise<void>

export type ComponentReporter = (context: Context, options: Object, error: any) => Promise<void> | void

export type ComponentLanguageParser = (context: Context, options: Object, file: File) => Promise<void> | void

export type ComponentLanguageProcessor = (context: Context, options: Object, file: File) => Promise<void> | void

export type ComponentLanguagePlugin = (context: Context, options: Object, file: File) => Promise<void> | void

export type ComponentLanguageGenerator = (
  context: Context,
  options: Object,
  file: File,
) => Promise<?FileGenerated> | FileGenerated
