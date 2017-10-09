// @flow

export type ComponentRules = {
  include?: string | Array<string>,
  exclude?: string | Array<string>,
  extensions?: Array<string>,
}

export type HookName = 'resolve' | 'report'

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
  rootDirectory: string,
}
export type ResolvePayload = {
  request: string,
  requestRoot: string,
  resolved: ?string,
  resolvedRoot: ?string,
  ignoredResolvers: Array<string>,
}
