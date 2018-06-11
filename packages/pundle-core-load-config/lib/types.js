// @flow

import type { Component } from 'pundle-api'

export type AcceptedConfig = {|
  cache?:
    | false
    | {
        rootDirectory: string,
      },
  entry?: Array<string> | string,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components?: Array<Component<any, any>>,
|}
export type Config = {|
  cache: {
    enabled: boolean,
    rootDirectory: string,
  },
  entry: Array<string>,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components: Array<Component<any, any>>,
|}
