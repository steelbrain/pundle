/* @flow */

import Path from 'path'
import unique from 'lodash.uniqby'
import { Disposable } from 'sb-event-kit'
import type { File, ComponentAny, Import } from 'pundle-api/types'

import { filterComponents, invokeComponent, mergeResult } from './helpers'
import type { ComponentEntry } from './types'
import type { Config } from '../types'

let uniqueID = 0

export default class Compilation {
  config: Config;
  components: Set<ComponentEntry>;

  constructor(config: Config) {
    this.config = config
    this.components = new Set()
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    for (const component of filterComponents(this.components, 'resolver')) {
      const result = await invokeComponent(this, component, request, from, cached)
      if (result) {
        return result
      }
    }

    const error = new Error(`Cannot find module '${request}'${from ? ` from '${from}'` : ''}`)
    // $FlowIgnore: This is a custom property
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  async generate(files: Array<File>, runtimeConfig: Object = {}): Promise<Object> {
    for (const component of filterComponents(this.components, 'generator')) {
      const result = await invokeComponent(this, component, files, runtimeConfig)
      if (result) {
        return result
      }
    }

    throw new Error('No suitable generator found')
  }
  // Notes:
  // Lock as early as resolved to avoid duplicates
  // Recurse asyncly until all resolves are taken care of
  // Set resolved paths on all file#imports
  async processTree(givenRequest: string, givenFrom: ?string, cached: boolean = true, files: Map<string, File>): Promise<Map<string, File>> {
    // const files: any = new Map()
    const processFile = async (path, from = null) => {
      const resolved = await this.resolve(path, from, cached)
      if (files.has(resolved)) {
        return resolved
      }
      // $FlowIgnore: We are using an invalid-ish flow type on purpose, 'cause flow is dumb and doesn't understand that we *fix* these nulls two lines below
      files.set(resolved, null)
      const file = await this.processFile(resolved, from, cached)
      files.set(resolved, file)
      await Promise.all(Array.from(file.imports).map(entry =>
        processFile(entry.request, resolved).then(function(resolvedImport) {
          entry.resolved = resolvedImport
        })
      ))
      return resolved
    }

    await processFile(givenRequest, givenFrom)
    return files
  }
  // Order of execution:
  // - Transformer (all)
  // - Loader (some)
  // - Post-Transformer (all)
  // - Plugin (all)
  // Notes:
  // - Do NOT double-resolve if already an absolute path
  // - We are executing Transformers before Loaders because imagine ES6 modules
  //   being transpiled with babel BEFORE giving to loader-js. If they are not
  //   transpiled before hand, they'll give a syntax error in loader
  async processFile(request: string, from: ?string, cached: boolean = true): Promise<File> {
    let resolved = request
    if (!Path.isAbsolute(resolved)) {
      resolved = await this.resolve(request, from, cached)
    }

    const source = await this.config.fileSystem.readFile(resolved)
    const file = {
      source,
      imports: new Set(),
      filePath: resolved,
      contents: source,
      sourceMap: null,
    }

    // Transformer
    for (const component of filterComponents(this.components, 'transformer')) {
      const transformerResult = await invokeComponent(this, component, Object.assign({}, file))
      mergeResult(file, transformerResult)
    }

    // Loader
    for (const component of filterComponents(this.components, 'loader')) {
      const loaderResult = await invokeComponent(this, component, Object.assign({}, file))
      mergeResult(file, loaderResult)
      const mergedImports = Array.from(file.imports).concat(Array.from(loaderResult.imports))
      const mergedUniqueImports = unique(mergedImports, 'request')
      file.imports = new Set(mergedUniqueImports)
      break
    }

    // Post-Transformer
    for (const component of filterComponents(this.components, 'post-transformer')) {
      const postTransformerResults = await invokeComponent(this, component, Object.assign({}, file))
      mergeResult(file, postTransformerResults)
    }

    // Plugin
    for (const component of filterComponents(this.components, 'plugin')) {
      await invokeComponent(this, component, Object.assign({}, file))
    }

    return file
  }
  getResolveRequest(request: string): Import {
    const id = (++uniqueID).toString()
    return { id, request, resolved: null }
  }
  addComponent(component: ComponentAny, config: Object): void {
    const entry = { component, config }
    this.components.add(entry)
    return new Disposable(() => {
      this.components.delete(entry)
    })
  }
  deleteComponent(component: ComponentAny, config: Object): void {
    for (const callback of this.components) {
      if (callback.config === config && callback.component === component) {
        this.components.delete(callback)
        break
      }
    }
  }
  dispose() {
    // Somewhere over the rainbow
  }
}
