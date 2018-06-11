// @flow

import fs from 'sb-fs'
import path from 'path'
import lowdb from 'lowdb'
import mkdirp from 'mkdirp'
import debounce from 'lodash/debounce'
import FileAsync from 'lowdb/adapters/FileAsync'
import { getStringHash, getFileKey, type Context, type ImportResolved, type ImportTransformed } from 'pundle-api'

export default class Cache {
  adapter: ?Object
  context: Context
  filePath: string
  constructor(context: Context) {
    this.adapter = null
    this.context = context
    this.filePath = path.join(context.config.cache.rootDirectory, `${getStringHash(context.config.rootDirectory)}.json`)
  }
  _report = (issue: any) => {
    this.context.invokeIssueReporters(issue)
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

    this.adapter = await lowdb(fileAdapter)
  }
  async getFile(fileImport: ImportResolved): Promise<?ImportTransformed> {
    const { adapter } = this
    if (!adapter) return null

    let stats
    try {
      stats = await fs.stat(fileImport.filePath)
    } catch (_) {
      return null
    }

    const fileKey = getFileKey(fileImport)
    const cachedVal = adapter.get(`files.${fileKey}`).value()
    if (!cachedVal) return null
    const mtime = parseInt(stats.mtime / 1000, 10)
    if (mtime !== cachedVal.mtime) return null

    const fileTransformed = cachedVal.value
    if (typeof fileTransformed.contents === 'object' && fileTransformed.contents) {
      fileTransformed.contents = Buffer.from(fileTransformed.contents)
    }
    return fileTransformed
  }
  setFile(fileImport: ImportResolved, file: ImportTransformed): void {
    const { adapter } = this
    if (!adapter) return

    fs.stat(fileImport.filePath).then(stats => {
      const mtime = parseInt(stats.mtime / 1000, 10)
      const fileKey = getFileKey(fileImport)
      adapter.set(`files.${fileKey}`, { mtime, value: file }).value()
      this.write()
    })
  }
  write = debounce(() => this.writeNow().catch(this._report), 1000, {
    trailing: true,
  })
  async writeNow() {
    this.write.cancel()

    const { adapter } = this
    if (adapter) {
      await adapter.write()
    }
  }
}
