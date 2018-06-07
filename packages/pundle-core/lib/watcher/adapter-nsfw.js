// @flow

import nsfw from 'nsfw'
import path from 'path'
import type { ChangeCallback } from './'

export default class AdapterChokdiar {
  handle: ?Object
  onChange: ChangeCallback
  rootDirectory: string
  constructor(rootDirectory: string, onChange: ChangeCallback) {
    this.rootDirectory = rootDirectory
    this.onChange = onChange

    this.handle = null
  }
  async watch(): Promise<void> {
    this.handle = await nsfw(
      this.rootDirectory,
      events => {
        events.forEach(event => {
          let type = null
          if (event.action === nsfw.actions.MODIFIED) {
            type = 'modify'
          } else if (event.action === nsfw.actions.CREATED) {
            type = 'add'
          } else if (event.action === nsfw.actions.DELETED) {
            type = 'delete'
          } else if (event.action === nsfw.actions.RENAMED) {
            type = 'rename'
          }

          if (type) {
            this.onChange(
              type,
              path.join(event.directory, event.file || event.newFile),
              event.oldFile ? path.join(event.directory, event.oldFile) : null,
            )
          } else {
            console.error(`Unknown NSFW file event detected: ${event}`)
          }
        })
      },
      { debounceMS: 60 },
    )
    this.handle.start()
  }
  close() {
    if (this.handle) {
      this.handle.stop()
    }
  }
}
