/* @flow */

import reporterCli from 'pundle-reporter-default'
import { Disposable } from 'sb-event-kit'
import { version as API_VERSION, getRelativeFilePath, MessageIssue } from 'pundle-api'
import type { File, FileChunk, ComponentAny, FileImport, ResolverResult, GeneratorResult } from 'pundle-api/types'

import * as Helpers from './helpers'
import type { ComponentEntry, PundleConfig } from '../../types'

export default class Context {
  uid: Map<string, number>;
  config: PundleConfig;
  components: Set<ComponentEntry>;

  constructor(config: PundleConfig) {
    this.uid = new Map()
    this.config = config
    this.components = new Set()
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
  async generate(given: Array<FileChunk>, generateConfig: Object = {}): Promise<Array<GeneratorResult>> {
    const chunks: Array<Object> = given.slice()
    const results = []

    for (let i = 0, length = chunks.length; i < length; i++) {
      const chunk: FileChunk = chunks[i]
      const chunkMappings = { chunks: {} }

      const childChunks: Map<number, FileChunk> = new Map()
      chunk.files.forEach(function(file) {
        file.chunks.forEach(function(entry) {
          childChunks.set(entry.id, entry)
        })
      })
      childChunks.forEach(function(entry) {
        chunkMappings.chunks[entry.id] = entry.label
      })

      let result
      for (const entry of Helpers.filterComponents(this.components, 'generator')) {
        result = await Helpers.invokeComponent(this, entry, 'callback', [this.config.output, { mappings: chunkMappings, label: chunk.label }, generateConfig], chunk)
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
  serialize(): string {
    const serializedUID = {}
    this.uid.forEach(function(value, key) {
      serializedUID[key] = value
    })

    return JSON.stringify({
      UID: serializedUID,
    })
  }
  unserialize(contents: string, force: boolean = false) {
    if (this.uid.size && !force) {
      throw new Error('Cannot unserialize into non-empty state without force parameter')
    }

    const parsed = JSON.parse(contents)

    // Unserializing UID
    this.uid.clear()
    for (const key in parsed) {
      if (!{}.hasOwnProperty.call(parsed, key)) continue
      this.uid.set(key, parsed[key])
    }
  }
  getUID(label: string): number {
    const uid = (this.uid.get(label) || 0) + 1
    this.uid.set(label, uid)
    return uid
  }
  getChunk(entries: ?Array<FileImport> = null, label: ?string = null, imports: ?Array<FileImport> = null, files: ?Map<string, File> = null): FileChunk {
    const id = this.getUID('chunk')
    return {
      id,
      label: label || id.toString(),
      files: files || new Map(),
      entries: entries || [],
      imports: imports || [],
    }
  }
  getImportRequest(request: string, from: ?string = null): FileImport {
    return { id: this.getUID('import'), request, resolved: null, from }
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
