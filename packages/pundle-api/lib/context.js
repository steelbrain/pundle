// @flow

import type { Config } from 'pundle-core-load-config'
import type { Component, ComponentType, GetFileNamePayload } from './types'
import { getFileName } from './common'

export default class Context {
  config: Config
  configInline: Object
  configFileName: string
  configLoadFile: boolean
  directory: string

  constructor({
    config,
    configInline,
    configFileName,
    configLoadFile,
    directory,
  }: {|
    config: Config,
    configInline: Object,
    configFileName: string,
    configLoadFile: boolean,
    directory: string,
  |}) {
    this.config = config
    this.configInline = configInline
    this.configFileName = configFileName
    this.configLoadFile = configLoadFile
    this.directory = directory
  }
  serialize() {
    return {
      configInline: this.configInline,
      configFileName: this.configFileName,
      configLoadFile: this.configLoadFile,
      directory: this.directory,
    }
  }
  getComponents<T1: ComponentType, T2>(type: T1): Array<Component<T1, T2>> {
    return this.config.components.filter(c => c.type === type)
  }
  getFileName(payload: GetFileNamePayload) {
    return getFileName(this.config.output.formats, payload)
  }
}
