// @flow

import path from 'path'
import lowdb from 'lowdb'
import mkdirp from 'mkdirp'
import debounce from 'lodash/debounce'
import FileAsync from 'lowdb/adapters/FileAsync'
import { getStringHash, type Context, type ImportTransformed } from 'pundle-api'

export default class Cache {
  adapter: ?Object
  context: Context
  filePath: string
  constructor(context: Context) {
    this.adapter = null
    this.context = context
    this.filePath = path.join(context.config.cache.rootDirectory, `${getStringHash(context.config.rootDirectory)}.json`)
  }
  async load() {
    if (!this.context.config.cache.enabled) return

    await new Promise((resolve, reject) => {
      mkdirp(path.dirname(this.filePath), err => {
        if (err) {
          reject(err)
        } else resolve()
      })
    })

    const fileAdapter = new FileAsync(this.filePath, {
      defaultValue: {
        files: {},
      },
    })
    const adapter = lowdb(fileAdapter)
    await adapter.read()

    this.adapter = adapter
  }
  getFile(key: string): ?ImportTransformed {
    const { adapter } = this
    if (!adapter) return null
    return adapter
      .get('posts')
      .get(key)
      .value()
  }
  setFile(key: string, file: ImportTransformed): void {
    const { adapter } = this
    if (!adapter) return

    adapter.set(`posts.${key}`, file).value()
    this.write()
  }
  write = debounce(
    () => {
      this.writeNow().catch(console.error)
    },
    1000,
    {
      trailing: true,
    },
  )
  async writeNow() {
    this.write.cancel()

    const { adapter } = this
    if (adapter) {
      await adapter.write()
    }
  }
}
