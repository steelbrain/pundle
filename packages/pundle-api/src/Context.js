// @flow

import path from 'path'
import invariant from 'assert'
import Imurmurhash from 'imurmurhash'

import File from './File'
import Components from './Components'
import ComponentOptions from './ComponentOptions'
import FileIssue from './issues/FileIssue'
import MessageIssue from './issues/MessageIssue'
import { normalizeFileName } from './common'
import type { Chunk, BaseConfig, ResolvePayload } from './types'

export default class Context {
  components: Components
  options: ComponentOptions
  config: BaseConfig

  constructor(components: Components, options: ComponentOptions, config: BaseConfig) {
    invariant(components instanceof Components, 'new Context() expects first parameter to be a Components instance')
    invariant(
      options instanceof ComponentOptions,
      'new Context() expects second parameter to be a ComponentOptions instance',
    )
    invariant(
      config && typeof config === 'object',
      `new Context() expects third parameter to be a non-null object, given: ${typeof config}`,
    )

    this.components = components
    this.options = options
    this.config = config
  }
  // NOTE: For internal use only
  async getFile(filePath: string): Promise<File> {
    return File.get(filePath, this.config.rootDirectory)
  }
  // NOTE: Public use allowed
  // NOTE: Both entry and imports MUST be pre-resolved
  getChunk(entry: ?string = null, imports: Array<string> = [], label: ?string = null): Chunk {
    let generatedLabel = label
    if (!generatedLabel) {
      if (entry) {
        generatedLabel = new Imurmurhash()
          .hash(entry)
          .result()
          .toString()
      } else {
        throw new Error('Either entry or label are required to make a chunk!')
      }
    }

    return {
      type: 'simple',
      entry,
      label: generatedLabel,
      imports,
    }
  }
  async report(report: Object): Promise<void> {
    // TODO: validation?
    const reporters = this.components.getReporters()
    for (const entry of reporters) {
      await entry.callback(this, this.options.get(entry), report)
    }
    if (!reporters.length) {
      console.error(report)
    }
  }
  async resolve(
    request: string,
    requestRoot: ?string = null,
    ignoredResolvers: Array<string> = [],
  ): Promise<?ResolvePayload> {
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
    const resolvers = this.components.getResolvers()
    const nonIgnoredResolvers = resolvers.filter(c => !ignoredResolvers.includes(c.name))

    const payload: ResolvePayload = {
      request,
      requestRoot: resolutionRoot,
      ignoredResolvers,

      resolved: null,
      resolvedRoot: null,
    }

    for (const entry of nonIgnoredResolvers) {
      await entry.callback(this, this.options.get(entry), payload)
    }
    if (!resolvers.length) {
      throw new MessageIssue('No module resolver configured in Pundle', 'error')
    }
    if (payload.resolved) {
      return payload
    }
    return null
  }
  async resolveSimple(
    request: string,
    fromFile: ?string = null,
    fromLine: ?number = null,
    fromColumn: ?number = null,
    ignoredResolvers: Array<string> = [],
  ): Promise<string> {
    const result = await this.resolve(request, fromFile ? path.dirname(fromFile) : null, ignoredResolvers)
    if (!result || !result.resolved) {
      if (fromFile) {
        throw new FileIssue({
          file: fromFile,
          line: fromLine,
          column: fromColumn,
          message: `Cannot find module '${request}'`,
        })
      } else {
        throw new MessageIssue(`Cannot find module '${request}'`)
      }
    }
    return normalizeFileName(path.relative(this.config.rootDirectory, result.resolved))
  }
}
