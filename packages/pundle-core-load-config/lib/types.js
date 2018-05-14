// @flow

import type { Component } from 'pundle-api'

export type Config = {|
  entry?: Array<string> | string,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components?: Array<Component<*, *>>,
|}
export type LoadedConfig = {|
  entry: Array<string>,
  rootDirectory: string,
  output: {
    formats: { [string]: string | false },
    rootDirectory: string,
  },
  components: Array<Component<*, *>>,
|}
