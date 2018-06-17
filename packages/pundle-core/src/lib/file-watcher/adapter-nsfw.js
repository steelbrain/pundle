// @flow

import path from 'path'

import { WatcherUnavailable } from './common'
import type { ChangeCallback } from './'

let nsfw
try {
  // eslint-disable-next-line
  nsfw = require('nsfw')
} catch (_) {
  /* No Op */
}

export default class AdapterNSFW {
  handle: ?Object
  onChange: ChangeCallback
  rootDirectory: string
  constructor(rootDirectory: string, onChange: ChangeCallback) {
    if (!nsfw) {
      throw new WatcherUnavailable('nsfw')
    }

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
          if (event.action === nsfw.actions.MODIFIED || event.action === nsfw.actions.RENAMED) {
            type = 'modify'
          } else if (event.action === nsfw.actions.CREATED) {
            type = 'add'
          } else if (event.action === nsfw.actions.DELETED) {
            type = 'delete'
          }

          if (type) {
            this.onChange(
              type,
              path.join(event.directory, event.newFile || event.file),
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
