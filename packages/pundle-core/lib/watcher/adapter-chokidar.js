// @flow

import chokidar from 'chokidar'

export default class AdapterChokdiar {
  handle: Object
  rootDirectory: string
  constructor(rootDirectory: string, onChange: (path: string) => void) {
    this.rootDirectory = rootDirectory

    this.handle = chokidar.watch([], {
      ignoreInitial: true,
      awaitWriteFinish: {
        pollInterval: 50,
        stabilityThreshold: 250,
      },
    })
    this.handle.on('change', path => onChange(path))
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
