// @flow

import type { Component } from 'pundle-api'

export type Config = {|
  entry?: Array<string> | string,
  rootDirectory: string,
  output?: {
    name: string,
    sourceMap?: boolean,
    sourceMapName?: string,
    rootDirectory: string,
  },
  components?: Array<Component<*, *>>,
|}
