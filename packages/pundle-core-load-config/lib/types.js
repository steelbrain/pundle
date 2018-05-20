// @flow

import type { Component } from 'pundle-api'

export type AcceptedConfig = {|
  entry?: Array<string> | string,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components?: Array<Component<any, any>>,
|}
export type Config = {|
  entry: Array<string>,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components: Array<Component<any, any>>,
|}
