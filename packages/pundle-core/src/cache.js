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

function statsToCacheKey(stats) {
  return stats ? `${parseInt(stats.mtime / 1000, 10)}::${stats.size}` : `null`
}

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
    const { cache: cacheConfig, configFilePath, rootDirectory } = this.context.config
    if (!cacheConfig.enabled) return

    const filePath = path.join(
      cacheConfig.rootDirectory,
      `${getStringHash(`${rootDirectory}-${cacheConfig.cacheKey}`)}.json`,
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

    const cacheKey = statsToCacheKey(configFilePath ? await fs.stat(configFilePath) : null)
    const fileAdapter = new FileAsync(filePath, {
      defaultValue: {
        files: {},
        cacheKey,
        version: majorVersion,
      },
    })

    const adapter = await lowdb(fileAdapter)
    if (adapter.get('cacheKey').value() !== cacheKey) {
      adapter
        .set('files', {})
        .set('cacheKey', cacheKey)
        .value()
      this.write()
    }
    this.adapter = adapter
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
    const cacheKey = statsToCacheKey(stats)
    if (cacheKey !== cachedVal.cacheKey) return null

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
      const fileKey = getFileKey(fileImport)
      const cacheKey = statsToCacheKey(stats)
      adapter.set(`files.${fileKey}`, { cacheKey, value: file }).value()
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
