// @flow

import chokidar from 'chokidar'
import type { ChangeCallback } from './'

export default class AdapterChokdiar {
  handle: Object
  rootDirectory: string
  constructor(rootDirectory: string, onChange: ChangeCallback) {
    this.rootDirectory = rootDirectory

    this.handle = chokidar.watch([], {
      ignoreInitial: true,
      awaitWriteFinish: {
        pollInterval: 30,
        stabilityThreshold: 60,
      },
    })
    this.handle.on('add', path => onChange('add', path, null))
    this.handle.on('unlink', path => onChange('delete', path, null))
    this.handle.on('change', path => onChange('modify', path, null))
  }
  watch(): Promise<void> {
    return new Promise(resolve => {
      this.handle.add(this.rootDirectory)
      this.handle.on('ready', resolve)
    })
  }
  close() {
    this.handle.close()
  }
}
