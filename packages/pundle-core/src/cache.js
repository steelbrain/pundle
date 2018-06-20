// @flow

import fs from 'sb-fs'
import path from 'path'
import lowdb from 'lowdb'
import mkdirp from 'mkdirp'
import debounce from 'lodash/debounce'
import FileAsync from 'lowdb/adapters/FileAsync'
import { getStringHash, getFileKey, type Context, type ImportResolved, type ImportTransformed } from 'pundle-api'

import { version } from '../package.json'

const majorVersion = version.split('.')[0]

export default class Cache {
  adapter: ?Object
  context: Context
  constructor(context: Context) {
    this.adapter = null
    this.context = context
  }
  _report = (issue: any) => {
    this.context.invokeIssueReporters(issue)
  }
  async load() {
    const cacheConfig = this.context.config.cache
    if (!cacheConfig.enabled) return

    const filePath = path.join(
      cacheConfig.rootDirectory,
      `${getStringHash(`${this.context.config.rootDirectory}-${cacheConfig.cacheKey}`)}.json`,
    )
    await new Promise((resolve, reject) => {
      mkdirp(path.dirname(filePath), err => {
        if (err) {
          reject(err)
        } else resolve()
      })
    })

    if (cacheConfig.reset && (await fs.exists(filePath))) {
      await fs.unlink(filePath)
    }

    const fileAdapter = new FileAsync(filePath, {
      defaultValue: {
        version: majorVersion,
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
    if (mtime !== cachedVal.mtime || stats.size !== cachedVal.size) return null

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
      adapter.set(`files.${fileKey}`, { mtime, size: stats.size, value: file }).value()
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
