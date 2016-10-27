/* @flow */

import { Disposable } from 'sb-event-kit'
import type { File, ComponentAny } from 'pundle-api/types'

import { filterComponents, invokeComponent, mergeResult } from './helpers'
import type { ComponentEntry } from './types'
import type { Config } from '../types'

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
  // Order of execution:
  // - Loader (some)
  // - Transformer (all)
  // - Post-Transformer (all)
  // - Plugin (all)
  async processFile(request: string, from: ?string, cached: boolean = true): Promise<File> {
    const resolved = await this.resolve(request, from, cached)
    const source = await this.config.fileSystem.readFile(resolved).toString()
    const file = {
      source,
      imports: new Set(),
      filePath: resolved,
      contents: source,
      sourceMap: null,
      publicPath: request,
    }

    // Loader
    // NOTE: Previous source map is dummy, no need to perform merge
    for (const component of filterComponents(this.components, 'loader')) {
      const loaderResult = await invokeComponent(this, component, Object.assign({}, file))
      Object.assign(file, loaderResult)
      break
    }

    // Transformer
    for (const component of filterComponents(this.components, 'transformer')) {
      const transformerResult = await invokeComponent(this, component, Object.assign({}, file))
      mergeResult(file, transformerResult)
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
