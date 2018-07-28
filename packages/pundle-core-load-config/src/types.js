// @flow

import type { Component } from 'pundle-api'

export type AcceptedConfig = {|
  cache?:
    | false
    | {
        reset?: boolean,
        cacheKey?: string,
        rootDirectory?: string,
      },
  entry?: Array<string> | string,
  target?: 'node' | 'browser',
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components?: Array<Component<any, any>>,
|}
export type Config = {|
  cache: {
    reset: boolean,
    enabled: boolean,
    cacheKey: string,
    rootDirectory: string,
  },
  entry: Array<string>,
  target: 'node' | 'browser',
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components: Array<Component<any, any>>,
  configFilePath: ?string,
|}
