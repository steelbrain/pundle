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
// TODO: When implementing merging, make sure order is respected
export type ComponentOptionsEntry = {
  name: string,
  config: Object,
}
