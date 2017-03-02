/* @flow */

import reporterCli from 'pundle-reporter-cli'
import { Disposable } from 'sb-event-kit'
import { version as API_VERSION, getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { File, FileChunk, ComponentAny, FileImport, ResolverResult, GeneratorResult } from 'pundle-api/types'

import Chunk from '../chunk'
import * as Helpers from './helpers'
import type { ComponentEntry, PundleConfig } from '../../types'

let uniqueID = 0

export default class Context {
  config: PundleConfig;
  components: Set<ComponentEntry>;

  constructor(config: PundleConfig) {
    this.config = config
    this.components = new Set()
  }
  // NOTE:
  // While we could create a new chunk in this file directly, this is to allow API consumers to create chunks
  getChunk(fileChunk: FileChunk, files: Map<string, File>, chunkOptions: Object = {}): Chunk {
    return Chunk.get(fileChunk, files, chunkOptions)
  }
  async report(report: Object): Promise<void> {
    let tried = false
    for (const entry of Helpers.filterComponents(this.components, 'reporter')) {
      await Helpers.invokeComponent(this, entry, 'callback', [], report)
      tried = true
    }
    if (!tried) {
      Helpers.invokeComponent(this, { config: {}, component: reporterCli }, 'callback', [], report)
    }
  }
  async resolveAdvanced(request: string, from: ?string = null, cached: boolean = true): Promise<ResolverResult> {
    const knownExtensions = Helpers.getAllKnownExtensions(this.components)
    const filteredComponents = Helpers.filterComponents(this.components, 'resolver')
    if (!filteredComponents.length) {
      throw new MessageIssue('No module resolver configured in Pundle. Try adding pundle-resolver-default to your configuration', 'error')
    }
    for (const entry of filteredComponents) {
      const result = await Helpers.invokeComponent(this, entry, 'callback', [{ knownExtensions }], request, from, cached)
      if (result && result.filePath) {
        return result
      }
    }
    const error = new Error(`Cannot find module '${request}'${from ? ` from '${getRelativeFilePath(from, this.config.rootDirectory)}'` : ''}`)
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  async resolve(request: string, from: ?string = null, cached: boolean = true): Promise<string> {
    return (await this.resolveAdvanced(request, from, cached)).filePath
  }
  async generate(given: Array<Chunk>, generateConfig: Object = {}): Promise<Array<GeneratorResult>> {
    const chunks: Array<Object> = given.slice()
    const mappings = Helpers.getChunksMappings(chunks)
    const results = []

    for (let i = 0, length = chunks.length; i < length; i++) {
      const chunk: Chunk = chunks[i]
      const chunkMappings = mappings[i]
      let result
      for (const entry of Helpers.filterComponents(this.components, 'generator')) {
        result = await Helpers.invokeComponent(this, entry, 'callback', [{ chunkMappings }, generateConfig], chunk)
        if (result) {
          break
        }
      }
      if (!result) {
        throw new MessageIssue('No generator returned generated contents. Try adding pundle-generator-default to your configuration', 'error')
      }
      // Post-Transformer
      for (const entry of Helpers.filterComponents(this.components, 'post-transformer')) {
        const postTransformerResults = await Helpers.invokeComponent(this, entry, 'callback', [], result.contents)
        Helpers.mergeResult(result, postTransformerResults)
      }
      results.push(result)
    }

    return results
  }
  setUniqueID(newUniqueID: number): void {
    uniqueID = newUniqueID
  }
  getUniqueID(): number {
    return uniqueID
  }
  getNextUniqueID(): number {
    return ++uniqueID
  }
  getImportRequest(request: string, from: ?string = null): FileImport {
    return { id: this.getNextUniqueID(), request, resolved: null, from }
  }
  addComponent(component: ComponentAny, config: Object): void {
    if (!component) {
      throw new Error('Invalid component provided')
    }
    if (component.$apiVersion !== API_VERSION) {
      throw new Error('API version of component mismatches')
    }
    this.components.add({ component, config })
    Helpers.invokeComponent(this, { component, config }, 'activate', [])
    return new Disposable(() => {
      this.deleteComponent(component, config)
    })
  }
  deleteComponent(component: ComponentAny, config: Object): boolean {
    for (const entry of this.components) {
      if (entry.config === config && entry.component === component) {
        this.components.delete(entry)
        Helpers.invokeComponent(this, entry, 'dispose', [])
        return true
      }
    }
    return false
  }
}
