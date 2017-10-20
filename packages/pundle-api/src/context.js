// @flow

import fs from 'fs'
import invariant from 'assert'
import pEachSeries from 'p-each-series'
import { promisify } from 'util'

import ComponentOptions from './component-options'
import { Components } from './components'
import { MessageIssue, FileMessageIssue } from './issues'
import type { File, Chunk, BaseConfig, ResolvePayload } from '../types'

const asyncStat = promisify(fs.stat)
const asyncReadFile = promisify(fs.readFile)

export default class Context {
  uid: Map<string, number>
  components: Components
  options: ComponentOptions
  config: BaseConfig

  constructor(
    components: Components,
    options: ComponentOptions,
    config: BaseConfig,
  ) {
    invariant(
      components instanceof Components,
      'new Context() expects first parameter to be a Components instance',
    )
    invariant(
      options instanceof ComponentOptions,
      'new Context() expects second parameter to be a ComponentOptions instance',
    )
    invariant(
      config && typeof config === 'object',
      `new Context() expects third parameter to be a non-null object, given: ${typeof config}`,
    )

    this.uid = new Map()
    this.components = components
    this.options = options
    this.config = config
  }
  // NOTE: For internal use only
  async getFile(filePath: string): Promise<File> {
    const stats = await asyncStat(filePath)
    const contents = await asyncReadFile(filePath, 'utf8')
    return {
      filePath,
      lastModified: stats.mtime.getTime() / 1000,
      contents,

      parsed: null,
      imports: [],
      chunks: [],
    }
  }
  // Note: Public use allowed
  // NOTE: Entry can be relative to root directory but files MUST be pre-resolved
  async getChunk(entry: string, files: Array<string> = []): Promise<Chunk> {
    // TODO: Validation
    const resolvedEntry = await this.resolveSimple(entry)

    return {
      entry: resolvedEntry,
      files,
    }
  }
  getUID(label: string): number {
    invariant(
      typeof label === 'string' && label,
      `getUID() expects first parameter to be non-null string, given: ${typeof label}`,
    )

    const uid = (this.uid.get(label) || 0) + 1
    this.uid.set(label, uid)
    return uid
  }
  async report(report: Object): Promise<void> {
    // TODO: validation?
    let tried = false
    await pEachSeries(this.components.getByHookName('report'), async entry => {
      await entry.callback(this, this.options.get(entry), report)
      tried = true
    })
    if (!tried) {
      console.error(report)
    }
  }
  async resolve(
    request: string,
    requestRoot: ?string = null,
    ignoredResolvers: Array<string> = [],
  ): Promise<ResolvePayload> {
    invariant(
      typeof request === 'string' && request,
      `resolve() expects first parameter to be non-null string, given: ${typeof request}`,
    )
    invariant(
      requestRoot === null || (typeof requestRoot === 'string' && requestRoot),
      `resolve() expects second parameter to be nullable string, given: ${typeof requestRoot}`,
    )
    invariant(
      Array.isArray(ignoredResolvers),
      `resolve() expects third parameter to be Array, given: ${typeof ignoredResolvers}`,
    )

    const resolutionRoot = requestRoot || this.config.rootDirectory
    const resolvers = this.components
      .getByHookName('resolve')
      .filter(c => !ignoredResolvers.includes(c.name))
    const resolveRequest: ResolvePayload = {
      request,
      requestRoot: resolutionRoot,
      resolved: null,
      resolvedRoot: null,
      ignoredResolvers,
    }
    let tried = false
    await pEachSeries(resolvers, async entry => {
      await entry.callback(this, this.options.get(entry), resolveRequest)
      tried = true
    })
    if (!tried) {
      throw new MessageIssue('No module resolver configured in Pundle', 'error')
    }
    if (resolveRequest.resolved) {
      return resolveRequest
    }
    throw new FileMessageIssue({
      file: resolutionRoot,
      message: `Cannot find module '${request}'`,
    })
  }
  async resolveSimple(
    request: string,
    requestSourceFile: ?string = null,
    ignoredResolvers: Array<string> = [],
  ): Promise<string> {
    const result = await this.resolve(
      request,
      requestSourceFile,
      ignoredResolvers,
    )
    invariant(
      result.resolved,
      'resolve() did not throw when module was not resolved. IMPOSSIBLE?!',
    )
    return result.resolved
  }
}